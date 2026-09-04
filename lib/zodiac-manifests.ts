import catalog from '../public/generated/lottery-catalog.json';
import type {LotteryType} from './lottery';
import {env} from 'cloudflare:workers';

type AssetBinding={fetch(request:Request):Promise<Response>};
const issues=Object.fromEntries(catalog.map(row=>[String(row.lotteryType),String(row.nextPeriod).padStart(3,'0')])) as Record<LotteryType,string>;

export async function getZodiacManifest(type:LotteryType,size:string):Promise<any>{
  const assets=(env as unknown as {ASSETS?:AssetBinding}).ASSETS;
  if(!assets)throw new Error('ASSETS binding unavailable');
  const path=`/generated/zodiac/type-${type}-${issues[type]}-${size}-manifest.json`;
  const response=await assets.fetch(new Request(`https://assets.local${path}`));
  if(!response.ok)throw new Error(`Zodiac manifest not found: ${path}`);
  return await response.json();
}

export function requestedLotteryType(query:Record<string,string|string[]|undefined>):LotteryType{
  const value=typeof query.type==='string'?query.type:'5';
  return value==='1'||value==='8'?value:'5';
}

