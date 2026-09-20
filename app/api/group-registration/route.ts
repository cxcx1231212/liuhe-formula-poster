import {env} from 'cloudflare:workers';

type SiteSettings={data?:{registration_url?:unknown}};

export async function GET(){
  try{
    const siteApi=(env as unknown as {SITE_API:Fetcher}).SITE_API;
    const response=await siteApi.fetch(new Request('https://internal/api/public/site-settings'));
    if(!response.ok)return Response.json({url:null},{status:502,headers:{'Cache-Control':'no-store'}});
    const result=await response.json() as SiteSettings;
    const value=result.data?.registration_url;
    if(typeof value!=='string')return Response.json({url:null},{status:502,headers:{'Cache-Control':'no-store'}});
    const url=new URL(value);
    if(url.protocol!=='https:')return Response.json({url:null},{status:502,headers:{'Cache-Control':'no-store'}});
    return Response.json({url:url.toString()},{headers:{'Cache-Control':'private, no-store'}});
  }catch{
    return Response.json({url:null},{status:502,headers:{'Cache-Control':'no-store'}});
  }
}
