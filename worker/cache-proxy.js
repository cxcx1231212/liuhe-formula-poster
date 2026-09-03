const POST_PATH = /^\/posts\//;const CURRENT_TTL = 300;const INDEX_TTL = 300;const HISTORY_TTL = 604800;const CURRENT_KV_TTL = 3600;const INDEX_KV_TTL = 600;const HISTORY_KV_TTL = 60 * 60 * 24 * 90;
const CACHE_VERSION = 'zodiac-history-v2';function isCacheableDocument(request, url) {  const isPage = url.pathname === '/' || POST_PATH.test(url.pathname);  return request.method === 'GET' && isPage &&    !request.headers.has('RSC') && !request.headers.has('Next-Router-Prefetch') &&    (request.headers.get('accept') || '').includes('text/html');}function cacheKey(url) {
  const versioned = new URL(url);
  versioned.searchParams.set('__formula_global_cache', CACHE_VERSION);
  return new Request(versioned.toString(), { method: 'GET' });
}

function legacyCacheKey(url) {
  return new Request(url.toString(), { method: 'GET' });
}function globalKey(url) {
  return 'html:' + CACHE_VERSION + ':' + url.pathname + url.search;
}

function legacyGlobalKey(url) {
  return 'html:' + url.pathname + url.search;
}function kindOf(headers) { return headers.get('x-formula-edge-cache-kind') || headers.get('x-formula-cache-kind') || 'current'; }function ttlFor(kind) { return kind === 'history' ? HISTORY_TTL : kind === 'index' ? INDEX_TTL : CURRENT_TTL; }function kvTtlFor(kind) { return kind === 'history' ? HISTORY_KV_TTL : kind === 'index' ? INDEX_KV_TTL : CURRENT_KV_TTL; }function makeResponse(body, sourceHeaders, edgeState, globalState, kind) {  const headers = new Headers(sourceHeaders);  headers.delete('set-cookie');  headers.delete('vary');  headers.set('cache-control', 'public, max-age=0, s-maxage=' + ttlFor(kind));  headers.set('x-formula-edge-cache', edgeState);  headers.set('x-formula-edge-cache-kind', kind);  headers.set('x-formula-global-cache', globalState);  return new Response(body, { status: 200, headers });}async function storeGlobal(env, url, response, kind) {  const html = await response.text();  await env.HTML_CACHE.put(globalKey(url), html, {    expirationTtl: kvTtlFor(kind),    metadata: { kind, contentType: response.headers.get('content-type') || 'text/html; charset=utf-8' },  });}export default {  async fetch(request, env, ctx) {    const url = new URL(request.url);    if (!isCacheableDocument(request, url)) return env.APP.fetch(request);    const localKey = cacheKey(url);
    ctx.waitUntil(Promise.all([
      caches.default.delete(legacyCacheKey(url)),
      env.HTML_CACHE.delete(legacyGlobalKey(url)),
    ]));
    const cached = await caches.default.match(localKey);    if (cached) {      const kind = kindOf(cached.headers);      if (cached.headers.get('x-formula-global-cache') !== 'HIT') ctx.waitUntil(storeGlobal(env, url, cached.clone(), kind));      return makeResponse(cached.body, cached.headers, 'HIT', cached.headers.get('x-formula-global-cache') || 'FILLING', kind);    }    const stored = await env.HTML_CACHE.getWithMetadata(globalKey(url), { type: 'text', cacheTtl: 60 });    if (stored.value !== null) {      const kind = stored.metadata?.kind || (url.pathname === '/' ? 'index' : 'history');      const response = makeResponse(stored.value, {        'content-type': stored.metadata?.contentType || 'text/html; charset=utf-8',      }, 'HIT', 'HIT', kind);      ctx.waitUntil(caches.default.put(localKey, response.clone()));      return response;    }    const origin = await env.APP.fetch(request);    if (origin.status !== 200 || !origin.headers.get('content-type')?.includes('text/html')) return origin;    const kind = url.pathname === '/' ? 'index' : kindOf(origin.headers);    const response = makeResponse(origin.body, origin.headers, 'MISS', 'MISS', kind);    ctx.waitUntil(Promise.all([      caches.default.put(localKey, response.clone()),      storeGlobal(env, url, response.clone(), kind),    ]));    return response;  },};
