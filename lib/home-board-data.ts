/* eslint-disable @typescript-eslint/no-explicit-any */
import {postAuthor} from '@/lib/post-authors';
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
const oneTitles=['历史轨迹完整公开','平码尾数实战参考','连续命中规律分享','下期特肖重点参考','平码推演清晰易懂','合数公式逐期验证','精选公式稳定追踪','独家思路免费公开','七码总分规律解析','本期规律参考分享'];
const twoTitles=['双肖同时开轨迹公开','两条公式同步验证','平码特码全部计入','双支公式清楚易懂','历史同期开出参考','两肖组合重点分享','逐期双线轨迹整理','精选双肖免费公开','双肖规律手机大字图','本期两肖参考分享'];
const common=['精准单支公式公开','多支组合逐项计算','历史轨迹清楚整理','本期号码重点参考','手机大字公式分享','全部公式自动筛选'];
const zodiacS=['特肖轨迹长期追踪','高准确率公式公开','历史表现自动排名','本期精选生肖参考','逐期回测清楚展示','手机大字图免费分享'];
const fushiS=['高准确率复式公开','历史表现自动排名','逐期回测清楚展示','本期精选组合参考','手机大字图免费分享','长期追踪及时更新'];
const dsS=['特码单双连准公开','简单加减清楚易懂','历史轨迹逐期验证','本期特单双重点参考','精选规律长期追踪'];
const waveS=['特码波色连准公开','红蓝绿波清楚展示','简单加减逐期验证','本期特波重点参考','精选规律长期追踪'];
const wxS=['特五行连准公开','简单算法逐期验证','本期五行重点参考','精选规律长期追踪'];
const jyS=['家野中特规律公开','生肖家野清楚展示','简单算法逐期验证','本期家野重点参考'];
const n=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:0;
const accuracy=(m:any)=>typeof m?.totalRate==='number'?n(m.totalRate):Array.isArray(m?.history)&&m.history.length?m.history.filter((x:any)=>x?.hit===true).length/m.history.length:typeof m?.recent30Rate==='number'?n(m.recent30Rate):n(m?.recent30Hits)/30;
const sorted=(items:any[]=[])=>items.map((method,index)=>({method,index,streak:n(method?.recentStreak??method?.streak),accuracy:accuracy(method)})).sort((a,b)=>b.streak-a.streak||b.accuracy-a.accuracy||a.index-b.index).map(x=>x.method);
const pad=(v:number|string)=>String(v).padStart(3,'0');

async function source(type:LotteryType,board:HomeBoardKey,category:string){
  const key=board==='pingte'&&category==='two'?'pingte2':board;
  const info=manifestInfo[key],assets=(env as unknown as {ASSETS?:AssetBinding}).ASSETS;
  if(!assets)throw new Error('ASSETS binding unavailable');
  const path=`/generated/${info.dir}/type-${type}-${info.issues[type]}-manifest.json`;
  const response=await assets.fetch(new Request(`https://assets.local${path}`));
  if(!response.ok)throw new Error(`Manifest not found: ${path}`);
  return await response.json();
}
function groupItems(manifest:any,board:HomeBoardKey,category:string){
  if(['tema','zodiac','fushi','kill'].includes(board))return manifest.groups?.[category]?.methods??[];
  return manifest.methods??[];
}
function makePost(type:LotteryType,board:HomeBoardKey,category:string,issue:number,m:any,index:number):Post{
  const q=`?type=${type}`,rank=m?.rank??pad(index+1),i=`${issue}期`;
  if(board==='pingte'){const two=category==='two';return {issue:i,href:`/posts/${two?'pingte2':'pingte'}/${issue}/${pad(index+1)}${q}`,title:`${postAuthor(type,two?'pingte2':'pingte',index)}【${two?'平特二肖':'平特一肖'}】${(two?twoTitles:oneTitles)[index%10]}`};}
  if(board==='tema'){const label:any={'3':'三码中特','8':'八码中特','10':'十码中特','18':'十八码中特'};return {issue:i,href:`/posts/tema/${category}/${issue}/${pad(index+1)}${q}`,title:`${postAuthor(type,`tema${category}` as any,index)}【${label[category]}】${common[index%common.length]}`};}
  if(board==='zodiac'){const label:any={'1':'一肖','3':'三肖','6':'六肖','9':'九肖'};return {issue:i,href:`/posts/zodiac/${category}/${issue}/${pad(index+1)}${q}`,title:`${postAuthor(type,`zodiac${category}` as any,index)}【${label[category]}中特】${zodiacS[index%zodiacS.length]}`};}
  if(board==='fushi'){const label:any={'22':'二中二','33':'三中三','2x':'二连肖','3x':'三连肖'};return {issue:i,href:`/posts/fushi/${category}/${issue}/${rank}${q}`,title:`${postAuthor(type,`fushi${category}` as any,index)}【${label[category]}】${fushiS[index%fushiS.length]}`};}
  if(board==='danshuang')return {issue:i,href:`/posts/danshuang/${issue}/${rank}${q}`,title:`${postAuthor(type,'danshuang',index)}【${m.label}】${dsS[index%dsS.length]}`};
  if(board==='wave')return {issue:i,href:`/posts/wave/${issue}/${rank}${q}`,title:`${postAuthor(type,'wave',index)}【特码波色】${waveS[index%waveS.length]}`};
  if(board==='wuxing')return {issue:i,href:`/posts/wuxing/${issue}/${rank}${q}`,title:`${postAuthor(type,'wuxing',index)}【${m.label}】${wxS[index%wxS.length]}`};
  if(board==='jiaye')return {issue:i,href:`/posts/jiaye/${issue}/${rank}${q}`,title:`${postAuthor(type,'jiaye',index)}【家野中特】${jyS[index%jyS.length]}`};
  if(board==='kill'){const label:any={code:'杀码',animal:'杀肖',tail:'杀尾',head:'杀头',wave:'杀波'};return {issue:i,href:`/posts/kill/${category}/${issue}/${rank}${q}`,title:`${postAuthor(type,`kill${category}` as any,index)}【${label[category]}】本期规律参考分享`};}
  if(board==='size')return {issue:i,href:`/posts/size/${issue}/${rank}${q}`,title:`${postAuthor(type,'size',index)}【特码大小】${m.name||'公式参考'}`};
  return {issue:i,href:`/posts/${board}/${issue}/${rank}${q}`,title:`${postAuthor(type,board,index)}【${m.label}】每期公式完整公开`};
}

export async function getHomeBoardPage(type:LotteryType,board:HomeBoardKey,category:string,page=1,pageSize=10){
  const manifest:any=await source(type,board,category),issue=Number(manifest.issue);
  const methods=sorted(groupItems(manifest,board,category));
  const pages=Math.max(1,Math.ceil(methods.length/pageSize)),safe=Math.min(Math.max(1,page),pages);
  const start=(safe-1)*pageSize;
  return {issue,total:methods.length,page:safe,pages,posts:methods.slice(start,start+pageSize).map((m,index)=>makePost(type,board,category,issue,m,start+index))};
}
