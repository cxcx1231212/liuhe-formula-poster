/* eslint-disable @typescript-eslint/no-explicit-any */
import {makeHomeBoardPost} from '@/lib/home-board-post';
import {env} from 'cloudflare:workers';

export type HomeBoardKey='pingte'|'tema'|'zodiac'|'fushi'|'danshuang'|'wave'|'wuxing'|'jiaye'|'kill'|'size'|'tail'|'head';
type LotteryType='1'|'5'|'8';
type Post={href:string;issue:string;title:string};
type AssetBinding={fetch(request:Request):Promise<Response>};
const manifestInfo:any={
  pingte:{dir:'pingte-all',issues:{1:'096',5:'246',8:'246'}},pingte2:{dir:'pingte-two',issues:{1:'096',5:'246',8:'246'}},
  tema:{dir:'tema-bundles',issues:{1:'096',5:'246',8:'246'}},zodiac:{dir:'zodiac',issues:{1:'096',5:'246',8:'246'}},
  fushi:{dir:'fushi',issues:{1:'096',5:'246',8:'246'}},danshuang:{dir:'danshuang',issues:{1:'096',5:'246',8:'246'}},
  wave:{dir:'wave',issues:{1:'096',5:'246',8:'246'}},wuxing:{dir:'wuxing',issues:{1:'096',5:'246',8:'246'}},
  jiaye:{dir:'jiaye',issues:{1:'095',5:'246',8:'246'}},kill:{dir:'kill',issues:{1:'096',5:'246',8:'246'}},
  size:{dir:'size',issues:{1:'095',5:'246',8:'246'}},tail:{dir:'tail',issues:{1:'095',5:'246',8:'246'}},head:{dir:'head',issues:{1:'095',5:'246',8:'246'}},
};
const n=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:0;
const accuracy=(m:any)=>typeof m?.totalRate==='number'?n(m.totalRate):Array.isArray(m?.history)&&m.history.length?m.history.filter((x:any)=>x?.hit===true).length/m.history.length:typeof m?.recent30Rate==='number'?n(m.recent30Rate):n(m?.recent30Hits)/30;
const sorted=(items:any[]=[])=>items.map((method,index)=>({method,index,streak:n(method?.recentStreak??method?.streak),accuracy:accuracy(method)})).sort((a,b)=>b.streak-a.streak||b.accuracy-a.accuracy||a.index-b.index).map(x=>x.method);

async function source(type:LotteryType,board:HomeBoardKey,category:string){
  const key=board==='pingte'?`pingte:${category==='two'?'two':'one'}`:`${board}:${category}`;
  const assets=(env as unknown as {ASSETS?:AssetBinding}).ASSETS;
  if(!assets)throw new Error('ASSETS binding unavailable');
  const safeKey=key.replace(':','-');
  const path=`/generated/home-board/type-${type}-${safeKey}.json`;
  const response=await assets.fetch(new Request(`https://assets.local${path}`));
  if(!response.ok)throw new Error(`Homepage data not found: ${path}`);
  return await response.json();
}
function groupItems(manifest:any,board:HomeBoardKey,category:string){
  return manifest.methods??[];
}
function makePost(type:LotteryType,board:HomeBoardKey,category:string,issue:number,m:any,index:number):Post{
  return makeHomeBoardPost(type,board,category,issue,m,index);
}

export async function getHomeBoardPage(type:LotteryType,board:HomeBoardKey,category:string,page=1,pageSize=10){
  const manifest:any=await source(type,board,category),issue=Number(manifest.issue);
  const methods=sorted(groupItems(manifest,board,category));
  const pages=Math.max(1,Math.ceil(methods.length/pageSize)),safe=Math.min(Math.max(1,page),pages);
  const start=(safe-1)*pageSize;
  return {issue,total:methods.length,page:safe,pages,posts:methods.slice(start,start+pageSize).map((m,index)=>makePost(type,board,category,issue,m,start+index))};
}

export async function getHomeBoardRecommendation(type:LotteryType,board:HomeBoardKey,category:string){
  const manifest:any=await source(type,board,category),issue=Number(manifest.issue);
  const method=sorted(groupItems(manifest,board,category))[0];
  if(!method)return {issue,formula:null,rank:null,href:null,title:null,image:null,recentStreak:0,recent30Hits:0,recent30Rate:0,totalRate:0,prediction:null,draws:[],recentHistory:[]};
  const sourceIndex=Number.isInteger(method.sourceIndex)?method.sourceIndex:0;
  const post=makePost(type,board,category,issue,method,sourceIndex);
  const prediction=method.next??method.predictionAnimals??method.predictionNumbers??method.predictionAnimal??method.predictionNumber??method.values??method.animals??method.numbers??method.prediction??null;
  return {issue,formula:method.name??method.sourceKey??method.label??null,rank:method.rank??pad(1),title:post.title,href:post.href,image:method.image??null,algorithmFamily:method.algorithmFamily??null,advancedSpecs:method.advancedSpecs??null,recentStreak:n(method.recentStreak??method.streak),recent30Hits:n(method.recent30Hits),recent30Rate:n(method.recent30Rate),totalRate:n(method.totalRate),prediction,draws:(manifest.draws??[]).slice(-5),recentHistory:method.recentHistory??[]};
}
