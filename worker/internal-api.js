import { WorkerEntrypoint } from 'cloudflare:workers';
import { PUBLIC_HOST, randomToken, sha256 } from './entry-gate.js';

// This named entrypoint is only reachable through an explicitly configured
// Cloudflare service binding. Public HTTP requests use cache-proxy.js instead.
export class FormulaInternalApi extends WorkerEntrypoint {
  async issueEntryTicket() {
    if (!this.env.ENTRY_TICKET) throw new Error('Entry ticket store unavailable');
    const token = randomToken();
    const digest = await sha256(`${PUBLIC_HOST}:${token}`);
    await this.env.ENTRY_TICKET.getByName(digest).issue(digest, Date.now() + 2 * 60 * 1000);
    return token;
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
