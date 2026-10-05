import {env} from 'cloudflare:workers';

export async function GET(request:Request){
  const key=new URL(request.url).searchParams.get('key');
  if(!key||!/^[A-Za-z0-9/_\-.]+$/.test(key)||key.includes('..'))return new Response(null,{status:400});
  try{
    const siteApi=(env as unknown as {SITE_API:Fetcher}).SITE_API;
    const response=await siteApi.fetch(new Request(`https://internal/ad-image/${key}`));
    if(!response.ok||!response.body)return new Response(null,{status:502});
    const contentType=response.headers.get('content-type')||'';
    if(!/^image\/(?:gif|png|jpeg|webp)(?:\s*;|$)/i.test(contentType))return new Response(null,{status:502});
    return new Response(response.body,{headers:{
      'Content-Type':contentType,
      'Cache-Control':'private, max-age=300, no-transform',
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'no-referrer',
    }});
  }catch{
    return new Response(null,{status:502});
  }
}

