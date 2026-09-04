import type {LotteryType} from './lottery';
import {env} from 'cloudflare:workers';
import catalog from '../public/generated/lottery-catalog.json';

async function load(type:LotteryType,folder:string){
  const current=catalog.find(row=>String(row.lotteryType)===String(type));
  if(!current)throw new Error('Missing lottery catalog: '+type);
  const issue=String(current.nextPeriod).padStart(3,'0');
  const path='/generated/'+folder+'/type-'+type+'-'+issue+'-manifest.json';
  const assets=(env as unknown as {ASSETS:{fetch(request:Request):Promise<Response>}}).ASSETS;
  const response=await assets.fetch(new Request('https://assets.local'+path));
  if(!response.ok)throw new Error('Missing current manifest: '+path);
  const data=await response.json() as any;
  if(Number(data.issue)!==Number(current.nextPeriod))throw new Error('Stale content manifest: '+path);
  return data;
}
const map=(folder:string)=>({get 1(){return load('1',folder)},get 5(){return load('5',folder)},get 8(){return load('8',folder)}});
export const pingteManifests={pingte:map('pingte-all'),wuxing:map('wuxing')};
export function requestedLotteryType(query:Record<string,string|string[]|undefined>):LotteryType{
  const value=typeof query.type==='string'?query.type:'5';
  return value==='1'||value==='8'?value:'5';
}
