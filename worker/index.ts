import app from 'vinext/server/app-router-entry';

type AppEnv=Parameters<typeof app.fetch>[1];
type AppContext=Parameters<typeof app.fetch>[2];
type WorkerContext={waitUntil(promise:Promise<unknown>):void};
type CacheStorageWithDefault={default:Cache};

const POST_PATH=/^\/posts\//;
const CURRENT_TTL=300;
const HISTORY_TTL=604800;
const CACHE_VERSION='zodiac-history-v2';

function isCacheableDocument(request:Request,url:URL){
  return request.method==='GET'&&POST_PATH.test(url.pathname)&&!request.headers.has('RSC')&&!request.headers.has('Next-Router-Prefetch')&&(request.headers.get('accept')||'').includes('text/html');
}
function cacheKey(url:URL){const versioned=new URL(url);versioned.searchParams.set('__formula_cache',CACHE_VERSION);return new Request(versioned.toString(),{method:'GET'});}
function legacyCacheKey(url:URL){return new Request(url.toString(),{method:'GET'});}
function withCacheHeaders(response:Response,state:'HIT'|'MISS'){const headers=new Headers(response.headers);headers.set('x-formula-cache',state);return new Response(response.body,{status:response.status,statusText:response.statusText,headers});}

export default {
  async fetch(request:Request,env:AppEnv,ctx:AppContext):Promise<Response>{
    const url=new URL(request.url);
    if(!isCacheableDocument(request,url))return app.fetch(request,env,ctx);
    const context=ctx as WorkerContext|undefined;
    if(!context)return app.fetch(request,env,ctx);
    const cache=(caches as unknown as CacheStorageWithDefault).default;
    const key=cacheKey(url);
    context.waitUntil(cache.delete(legacyCacheKey(url)));
    const cached=await cache.match(key);
    if(cached)return withCacheHeaders(cached,'HIT');
    const response=await app.fetch(request,env,ctx);
    if(response.status!==200||!response.headers.get('content-type')?.includes('text/html'))return response;
    const copy=response.clone();
    const returned=withCacheHeaders(response,'MISS');
    context.waitUntil((async()=>{
      const html=await copy.text();
      const isHistory=!html.includes('等待开奖');
      const headers=new Headers(copy.headers);
      headers.delete('set-cookie');headers.delete('vary');
      headers.set('cache-control','public, max-age=0, s-maxage='+(isHistory?HISTORY_TTL:CURRENT_TTL));
      headers.set('x-formula-cache','HIT');headers.set('x-formula-cache-kind',isHistory?'history':'current');
      await cache.put(key,new Response(html,{status:copy.status,statusText:copy.statusText,headers}));
    })());
    return returned;
  },
};
