import cacheProxy from './cache-proxy.js';
import { checkEntry, cookieFrom } from './entry-gate.js';
import { encryptResponse, encryptedPageShell, keyResponse, sessionKey } from './content-crypto.js';

export { PostViewCounter } from './cache-proxy.js';
export { FormulaInternalApi } from './internal-api.js';
export { EntrySession, EntryTicket } from './entry-session.js';

function protectedResponse(response) {
  const headers = new Headers(response.headers);
  headers.set('cache-control', 'private, no-store, no-transform');
  headers.set('referrer-policy', 'no-referrer');
  headers.set('content-security-policy', "frame-ancestors 'self'");
  headers.set('x-frame-options', 'SAMEORIGIN');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

const edgeEntry = {
  async fetch(request, env, ctx) {
    try {
      if (!env.ENTRY_SESSION) return protectedResponse(new Response('访问验证不可用', { status: 503 }));
      const decision = await checkEntry(request, env);
      if (decision.response) return protectedResponse(decision.response);
      const sessionId = decision.sessionId || cookieFrom(request);
      if (!sessionId || !env.ENTRY_FIXED_KEY) throw new Error('Encrypted session unavailable');
      const key = await sessionKey(env.ENTRY_FIXED_KEY, sessionId);
      const url = new URL(decision.request.url);
      const finish = response => {if(decision.setCookie){const headers=new Headers(response.headers);headers.append('set-cookie',decision.setCookie);response=new Response(response.body,{status:response.status,headers});}return protectedResponse(response);};
      if (url.pathname === '/_entry/key') return finish(keyResponse(key));
      if (request.method==='GET' && !url.searchParams.has('__formula_payload') && (url.pathname==='/' || url.pathname.startsWith('/posts/')) && !request.headers.has('RSC')) return finish(encryptedPageShell(url,decision.shareToken));
      const response = await cacheProxy.fetch(decision.request, env, ctx);
      const plainType = response.headers.get('content-type') || '';
      if (request.method === 'HEAD' || response.status === 204 || response.status === 304) return protectedResponse(response);
      if (plainType.toLowerCase().includes('text/html') && response.status === 200) {
        if (!url.searchParams.has('__formula_payload')) return finish(encryptedPageShell(url,decision.shareToken));
        return finish(await encryptResponse(response, key, plainType, true,decision.shareToken));
      }
      if (/^application\/json\b|[+]json\b|^text\/x-component\b/i.test(plainType) || url.pathname.endsWith('.json')) {
        return finish(await encryptResponse(response, key, plainType || 'application/json; charset=utf-8'));
      }
      return finish(response);
    } catch (error) {
      console.error(JSON.stringify({ event: 'entry_gate_failed', path: new URL(request.url).pathname, error: String(error) }));
      return protectedResponse(new Response('访问验证暂不可用', { status: 503 }));
    }
  },
};

export default edgeEntry;
