import { WorkerEntrypoint } from 'cloudflare:workers';
import { issueReferralTicket } from './entry-gate.js';

// This named entrypoint is only reachable through an explicitly configured
// Cloudflare service binding. Public HTTP requests use cache-proxy.js instead.
export class FormulaInternalApi extends WorkerEntrypoint {
  async issueEntryTicket() {
    if (!this.env.ENTRY_TICKET || !this.env.ENTRY_FIXED_KEY) throw new Error('Entry ticket protection unavailable');
    return issueReferralTicket(this.env.ENTRY_FIXED_KEY);
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== 'GET') return new Response(null, { status: 405 });
    if (!['/api/formula-recommendations', '/api/formula-recommendations/thumbnail'].includes(url.pathname)) {
      return new Response('Not found', { status: 404 });
    }
    if (!['1', '5', '8'].includes(url.searchParams.get('lotteryType') || '5')) {
      return new Response('Invalid lottery type', { status: 400 });
    }
    if (url.pathname.endsWith('/thumbnail')) {
      const board = url.searchParams.get('board') || '';
      const category = url.searchParams.get('category') || '';
      if (!['pingte', 'tema', 'zodiac', 'fushi', 'danshuang', 'wave', 'wuxing', 'jiaye', 'kill', 'size', 'tail', 'head'].includes(board) || !/^[-a-z0-9]{0,16}$/i.test(category)) {
        return new Response('Invalid thumbnail', { status: 400 });
      }
    }
    if (!this.env.APP) return new Response('Backend unavailable', { status: 503 });
    return this.env.APP.fetch(new Request(url.toString(), { headers: { accept: url.pathname.endsWith('/thumbnail') ? 'image/svg+xml' : 'application/json' } }));
  }
}
