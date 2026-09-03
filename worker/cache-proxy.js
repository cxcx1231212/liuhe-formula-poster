const POST_PATH = /^\/posts\//;
const CURRENT_TTL = 300;
const HISTORY_TTL = 604800;
const KV_TTL = 60 * 60 * 24 * 90;

function isCacheableDocument(request, url) {
  return request.method === 'GET' &&
    POST_PATH.test(url.pathname) &&
    !request.headers.has('RSC') &&
    !request.headers.has('Next-Router-Prefetch') &&
    (request.headers.get('accept') || '').includes('text/html');
}

function cacheKey(url) {
  return new Request(url.toString(), { method: 'GET' });
}

function globalKey(url) {
  return 'html:' + url.pathname + url.search;
}

function responseWithHeaders(body, headers, edgeState, globalState) {
  const next = new Headers(headers);
  next.set('x-formula-edge-cache', edgeState);
  if (globalState) next.set('x-formula-global-cache', globalState);
  return new Response(body, { status: 200, headers: next });
}

async function putLocal(key, response) {
  await caches.default.put(key, response);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!isCacheableDocument(request, url)) return env.APP.fetch(request);

    const localKey = cacheKey(url);
    const cached = await caches.default.match(localKey);
    if (cached) return responseWithHeaders(cached.body, cached.headers, 'HIT', cached.headers.get('x-formula-global-cache'));

    const stored = await env.HTML_CACHE.getWithMetadata(globalKey(url), {
      type: 'text',
      cacheTtl: 300,
    });
    if (stored.value !== null) {
      const headers = new Headers(stored.metadata?.headers || {});
      headers.set('content-type', headers.get('content-type') || 'text/html; charset=utf-8');
      headers.set('cache-control', 'public, max-age=0, s-maxage=' + HISTORY_TTL);
      headers.set('x-formula-global-cache', 'HIT');
      const response = responseWithHeaders(stored.value, headers, 'HIT', 'HIT');
      ctx.waitUntil(putLocal(localKey, response.clone()));
      return response;
    }

    const origin = await env.APP.fetch(request);
    if (origin.status !== 200 || !origin.headers.get('content-type')?.includes('text/html')) return origin;

    const isHistory = origin.headers.get('x-formula-cache-kind') === 'history';
    const ttl = isHistory ? HISTORY_TTL : CURRENT_TTL;
    const headers = new Headers(origin.headers);
    headers.delete('set-cookie');
    headers.delete('vary');
    headers.set('cache-control', 'public, max-age=0, s-maxage=' + ttl);
    headers.set('x-formula-edge-cache', 'HIT');
    headers.set('x-formula-edge-cache-kind', isHistory ? 'history' : 'current');
    headers.set('x-formula-global-cache', 'MISS');

    const cacheable = new Response(origin.clone().body, {
      status: origin.status,
      statusText: origin.statusText,
      headers,
    });
    ctx.waitUntil(putLocal(localKey, cacheable));

    if (isHistory) {
      const metadata = {
        headers: {
          'content-type': headers.get('content-type') || 'text/html; charset=utf-8',
          'last-modified': headers.get('last-modified') || '',
        },
      };
      ctx.waitUntil(origin.clone().text().then((html) =>
        env.HTML_CACHE.put(globalKey(url), html, { expirationTtl: KV_TTL, metadata })
      ));
    }

    return responseWithHeaders(origin.body, origin.headers, 'MISS', 'MISS');
  },
};
