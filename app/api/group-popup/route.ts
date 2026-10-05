import {env} from 'cloudflare:workers';

type Ad={position_key?:unknown;image_url?:unknown;link_url?:unknown;display_mode?:unknown;delay_seconds?:unknown};
type AdsResponse={data?:unknown};

const headers={'Cache-Control':'private, no-store, no-transform','Referrer-Policy':'no-referrer'};

function publicUrl(value:unknown){
  if(typeof value!=='string'||!value.trim())return null;
  try{
    const url=new URL(value,'https://internal');
    if(url.origin==='https://internal'){
      const key=url.pathname.startsWith('/ad-image/')?url.pathname.slice('/ad-image/'.length):'';
      if(!/^[A-Za-z0-9/_\-.]+$/.test(key)||key.includes('..'))return null;
      return `/api/group-popup-image?key=${encodeURIComponent(key)}`;
    }
    return url.protocol==='https:'?url.toString():null;
  }catch{return null;}
}

function linkUrl(value:unknown){
  if(typeof value!=='string'||!value.trim())return null;
  try{
    const url=new URL(value);
    return url.protocol==='https:'||url.protocol==='http:'?url.toString():null;
  }catch{return null;}
}

export async function GET(){
  try{
    const siteApi=(env as unknown as {SITE_API:Fetcher}).SITE_API;
    const response=await siteApi.fetch(new Request('https://internal/api/public/ads'));
    if(!response.ok)return Response.json({popup:null},{status:502,headers});
    const result=await response.json() as AdsResponse;
    const ad=Array.isArray(result.data)?result.data.find((item:Ad)=>item?.position_key==='popup') as Ad|undefined:undefined;
    const imageUrl=publicUrl(ad?.image_url);
    if(!imageUrl)return Response.json({popup:null},{headers});
    const seconds=Number(ad?.delay_seconds);
    return Response.json({popup:{
      imageUrl,
      linkUrl:linkUrl(ad?.link_url),
      displayMode:ad?.display_mode==='daily'?'daily':'always',
      delaySeconds:Number.isFinite(seconds)?Math.max(0,Math.min(10,seconds)):0,
    }},{headers});
  }catch{
    return Response.json({popup:null},{status:502,headers});
  }
}

export async function POST(request:Request){
  try{
    const payload=await request.json() as {eventType?:unknown};
    if(payload.eventType!=='view'&&payload.eventType!=='click')return new Response(null,{status:400});
    const siteApi=(env as unknown as {SITE_API:Fetcher}).SITE_API;
    const body=new URLSearchParams({
      position_key:'popup',
      event_type:payload.eventType,
      device:/Android|iPhone|iPad|Mobile/i.test(request.headers.get('user-agent')||'')?'mobile':'desktop',
      page_path:'/',
    });
    const response=await siteApi.fetch(new Request('https://internal/api/public/ad-event',{
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body,
    }));
    return new Response(null,{status:response.ok?204:502,headers});
  }catch{
    return new Response(null,{status:502,headers});
  }
}

