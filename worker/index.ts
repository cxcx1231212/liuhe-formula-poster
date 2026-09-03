type App = (typeof import('vinext/server/app-router-entry'))['default'];
type AppEnv = Parameters<App['fetch']>[1];
type AppContext = Parameters<App['fetch']>[2];

const POST_PATH = /^\/posts\//;
const CURRENT_TTL = 300;
const HISTORY_TTL = 604800;

async function runApp(request: Request, env: AppEnv, ctx: AppContext) {
  const { default: app } = await import('vinext/server/app-router-entry');
  return app.fetch(request, env, ctx);
}

function isCacheableDocument(request: Request, url: URL) {
  return request.method === 'GET' &&
    POST_PATH.test(url.pathname) &&
    !request.headers.has('RSC') &&
    !request.headers.has('Next-Router-Prefetch') &&
    (request.headers.get('accept') || '').includes('text/html');
}

function cacheKey(url: URL) {
  return new Request(url.toString(), { method: 'GET' });
}

function withCacheHeaders(response: Response, state: 'HIT' | 'MISS') {
  const headers = new Headers(response.headers);
  headers.set('x-formula-cache', state);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: AppEnv, ctx: AppContext): Promise<Response> {
    const url = new URL(request.url);
    if (!isCacheableDocument(request, url)) return runApp(request, env, ctx);

    const key = cacheKey(url);
    const cached = await caches.default.match(key);
    if (cached) return withCacheHeaders(cached, 'HIT');

    const response = await runApp(request, env, ctx);
    if (response.status !== 200 || !response.headers.get('content-type')?.includes('text/html')) {
      return response;
    }

    const copy = response.clone();
    const returned = withCacheHeaders(response, 'MISS');
    ctx.waitUntil((async () => {
      const html = await copy.text();
      const isHistory = !html.includes('等待开奖');
      const headers = new Headers(copy.headers);
      headers.delete('set-cookie');
      headers.delete('vary');
      headers.set(
        'cache-control',
        'public, max-age=0, s-maxage=' + (isHistory ? HISTORY_TTL : CURRENT_TTL),
      );
      headers.set('x-formula-cache', 'HIT');
      headers.set('x-formula-cache-kind', isHistory ? 'history' : 'current');
      await caches.default.put(
        key,
        new Response(html, {
          status: copy.status,
          statusText: copy.statusText,
          headers,
        }),
      );
    })());
    return returned;
  },
};
