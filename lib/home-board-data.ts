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

async function fullRecommendationSource(type:LotteryType,board:HomeBoardKey,category:string,issue:number){
  const assets=(env as unknown as {ASSETS?:AssetBinding}).ASSETS;
  if(!assets)return null;
  const dir=board==='pingte'?(category==='two'?'pingte-two':'pingte-all'):board==='tema'?'tema-bundles':board;
  const suffix=board==='zodiac'?`-${category}`:'';
  const path=`/generated/${dir}/type-${type}-${String(issue).padStart(3,'0')}${suffix}-manifest.json`;
  try{
    const response=await assets.fetch(new Request(`https://assets.local${path}`));
    return response.ok?await response.json() as any:null;
  }catch{return null;}
}

function storedPrediction(method:any){
  return method.next??method.nextNumber??method.nextAnimal??method.prediction??method.predictionNumbers??method.predictionAnimals??method.predictionNumber??method.predictionAnimal??method.values??method.numbers??method.animals??null;
}

export async function getHomeBoardPage(type:LotteryType,board:HomeBoardKey,category:string,page=1,pageSize=10){
  if(!Number.isSafeInteger(page)||page<1||pageSize!==10)throw new Error('Invalid pagination');
  const manifest:any=await source(type,board,category),issue=Number(manifest.issue);
  const methods=sorted(groupItems(manifest,board,category));
  const pages=Math.max(1,Math.ceil(methods.length/pageSize)),safe=Math.min(Math.max(1,page),pages);
  const start=(safe-1)*pageSize;
  return {issue,total:methods.length,page:safe,pages,posts:methods.slice(start,start+pageSize).map((m,index)=>makePost(type,board,category,issue,m,start+index))};
}

export const boardSearchTargets=[
 ['pingte','平特公式',['one','two']],['tema','特码公式',['3','8','10','18']],['zodiac','生肖公式',['1','3','6','9']],['fushi','复式公式',['22','33','2x','3x']],['kill','绝杀公式',['code','animal','tail','head','wave']],
 ...[['danshuang','单双公式'],['wave','波色公式'],['wuxing','五行公式'],['jiaye','家野公式'],['size','大小公式'],['tail','尾数公式'],['head','头数公式']].map(([key,label])=>[key,label,['']]),
] as [HomeBoardKey,string,string[]][];
export function validBoardCategory(board:string,category:string){return boardSearchTargets.some(([key,,categories])=>key===board&&categories.includes(category));}
export async function searchHomeBoards(type:LotteryType,query:string,page:number){
 const words=query.trim().toLowerCase().split(/\s+/),pageSize=30,start=(page-1)*pageSize;
 let total=0;const posts:any[]=[];
 for(const [board,boardName,categories] of boardSearchTargets)for(const category of categories){
  const manifest:any=await source(type,board,category);
  for(const [index,method] of sorted(manifest.methods).entries()){
   const post=makePost(type,board,category,Number(manifest.issue),method,index);
   const formulaName=String(method.name||method.sourceKey||method.label||'公式资料');
   if(!words.every(word=>`${post.title} ${boardName} ${post.issue} ${formulaName}`.toLowerCase().includes(word)))continue;
   if(total>=start&&posts.length<pageSize)posts.push({...post,boardName,categoryName:category,formulaName});
   total++;
  }
 }
 return {total,page,pages:Math.max(1,Math.ceil(total/pageSize)),posts};
}

export async function getHomeBoardRecommendation(type:LotteryType,board:HomeBoardKey,category:string){
  const manifest:any=await source(type,board,category),issue=Number(manifest.issue);
  const method=sorted(groupItems(manifest,board,category))[0];
  if(!method)return {issue,formula:null,rank:null,href:null,title:null,image:null,recentStreak:0,recent30Hits:0,recent30Rate:0,totalRate:0,prediction:null,draws:[],recentHistory:[]};
  const sourceIndex=Number.isInteger(method.sourceIndex)?method.sourceIndex:0;
  const post=makePost(type,board,category,issue,method,sourceIndex);
  const calculatedOnly=board==='danshuang'||board==='head'||board==='size'||board==='tail'||board==='wave'||(board==='fushi'&&['2x','3x'].includes(category));
  const fullManifest=storedPrediction(method)!==null||calculatedOnly?null:await fullRecommendationSource(type,board,category,issue);
  const fullItems=board==='zodiac'?fullManifest?.group?.methods:fullManifest?.groups?.[category]?.methods??fullManifest?.methods;
  const fullMethod=Array.isArray(fullItems)?fullItems[sourceIndex]??null:null;
  const selected=fullMethod?{...method,...fullMethod}:method;
  const prediction=storedPrediction(selected);
  const rank=String(selected.rank??sourceIndex+1).padStart(3,'0');
  return {issue,formula:selected.name??selected.sourceKey??selected.label??null,rank,title:post.title,href:post.href,image:selected.image??null,algorithmFamily:selected.algorithmFamily??null,advancedSpecs:selected.advancedSpecs??null,recentStreak:n(selected.recentStreak??selected.streak),recent30Hits:n(selected.recent30Hits),recent30Rate:n(selected.recent30Rate),totalRate:n(selected.totalRate),prediction,draws:(fullManifest?.draws??manifest.draws??[]).slice(-5),recentHistory:selected.recentHistory??[]};
}
