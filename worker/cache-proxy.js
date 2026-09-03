const POST_PATH = /^\/posts\//;
const CURRENT_TTL = 300;
const HISTORY_TTL = 604800;

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

function withEdgeCacheHeader(response, state) {
  const headers = new Headers(response.headers);
  headers.set('x-formula-edge-cache', state);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!isCacheableDocument(request, url)) {
      return env.APP.fetch(request);
    }

    const key = cacheKey(url);
    const cached = await caches.default.match(key);
    if (cached) return withEdgeCacheHeader(cached, 'HIT');

    const response = await env.APP.fetch(request);
    if (response.status !== 200 || !response.headers.get('content-type')?.includes('text/html')) {
      return response;
    }

    const cacheCopy = response.clone();
    const returned = withEdgeCacheHeader(response, 'MISS');
    const isHistory = cacheCopy.headers.get('x-formula-cache-kind') === 'history';
    const headers = new Headers(cacheCopy.headers);
    headers.delete('set-cookie');
    headers.delete('vary');
    headers.set(
      'cache-control',
      'public, max-age=0, s-maxage=' + (isHistory ? HISTORY_TTL : CURRENT_TTL),
    );
    headers.set('x-formula-edge-cache', 'HIT');
    headers.set('x-formula-edge-cache-kind', isHistory ? 'history' : 'current');

    ctx.waitUntil(caches.default.put(
      key,
      new Response(cacheCopy.body, {
        status: cacheCopy.status,
        statusText: cacheCopy.statusText,
        headers,
      }),
    ));
    return returned;
  },
};
