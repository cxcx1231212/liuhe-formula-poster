/* eslint-disable @typescript-eslint/no-explicit-any */
import {postAuthor} from '@/lib/post-authors';
import one1 from '@/public/generated/pingte-all/type-1-096-manifest.json';import one5 from '@/public/generated/pingte-all/type-5-246-manifest.json';import one8 from '@/public/generated/pingte-all/type-8-246-manifest.json';
import two1 from '@/public/generated/pingte-two/type-1-096-manifest.json';import two5 from '@/public/generated/pingte-two/type-5-246-manifest.json';import two8 from '@/public/generated/pingte-two/type-8-246-manifest.json';
import tema1 from '@/public/generated/tema-bundles/type-1-096-manifest.json';import tema5 from '@/public/generated/tema-bundles/type-5-246-manifest.json';import tema8 from '@/public/generated/tema-bundles/type-8-246-manifest.json';
import zodiac1 from '@/public/generated/zodiac/type-1-096-manifest.json';import zodiac5 from '@/public/generated/zodiac/type-5-246-manifest.json';import zodiac8 from '@/public/generated/zodiac/type-8-246-manifest.json';
import fushi1 from '@/public/generated/fushi/type-1-096-manifest.json';import fushi5 from '@/public/generated/fushi/type-5-246-manifest.json';import fushi8 from '@/public/generated/fushi/type-8-246-manifest.json';
import ds1 from '@/public/generated/danshuang/type-1-096-manifest.json';import ds5 from '@/public/generated/danshuang/type-5-246-manifest.json';import ds8 from '@/public/generated/danshuang/type-8-246-manifest.json';
import wave1 from '@/public/generated/wave/type-1-096-manifest.json';import wave5 from '@/public/generated/wave/type-5-246-manifest.json';import wave8 from '@/public/generated/wave/type-8-246-manifest.json';
import wx1 from '@/public/generated/wuxing/type-1-096-manifest.json';import wx5 from '@/public/generated/wuxing/type-5-246-manifest.json';import wx8 from '@/public/generated/wuxing/type-8-246-manifest.json';
import jy1 from '@/public/generated/jiaye/type-1-095-manifest.json';import jy5 from '@/public/generated/jiaye/type-5-246-manifest.json';import jy8 from '@/public/generated/jiaye/type-8-246-manifest.json';
import kill1 from '@/public/generated/kill/type-1-096-manifest.json';import kill5 from '@/public/generated/kill/type-5-246-manifest.json';import kill8 from '@/public/generated/kill/type-8-246-manifest.json';
import size1 from '@/public/generated/size/type-1-095-manifest.json';import size5 from '@/public/generated/size/type-5-246-manifest.json';import size8 from '@/public/generated/size/type-8-246-manifest.json';
import tail1 from '@/public/generated/tail/type-1-095-manifest.json';import tail5 from '@/public/generated/tail/type-5-246-manifest.json';import tail8 from '@/public/generated/tail/type-8-246-manifest.json';
import head1 from '@/public/generated/head/type-1-095-manifest.json';import head5 from '@/public/generated/head/type-5-246-manifest.json';import head8 from '@/public/generated/head/type-8-246-manifest.json';

export type HomeBoardKey='pingte'|'tema'|'zodiac'|'fushi'|'danshuang'|'wave'|'wuxing'|'jiaye'|'kill'|'size'|'tail'|'head';
type LotteryType='1'|'5'|'8';
type Post={href:string;issue:string;title:string};
const manifests:any={
  pingte:{1:one1,5:one5,8:one8},pingte2:{1:two1,5:two5,8:two8},tema:{1:tema1,5:tema5,8:tema8},zodiac:{1:zodiac1,5:zodiac5,8:zodiac8},
  fushi:{1:fushi1,5:fushi5,8:fushi8},danshuang:{1:ds1,5:ds5,8:ds8},wave:{1:wave1,5:wave5,8:wave8},wuxing:{1:wx1,5:wx5,8:wx8},
  jiaye:{1:jy1,5:jy5,8:jy8},kill:{1:kill1,5:kill5,8:kill8},size:{1:size1,5:size5,8:size8},tail:{1:tail1,5:tail5,8:tail8},head:{1:head1,5:head5,8:head8},
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

function source(type:LotteryType,board:HomeBoardKey,category:string){
  if(board==='pingte')return category==='two'?manifests.pingte2[type]:manifests.pingte[type];
  return manifests[board][type];
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

export function getHomeBoardPage(type:LotteryType,board:HomeBoardKey,category:string,page=1,pageSize=10){
  const manifest=source(type,board,category),issue=Number(manifest.issue);
  const methods=sorted(groupItems(manifest,board,category));
  const pages=Math.max(1,Math.ceil(methods.length/pageSize)),safe=Math.min(Math.max(1,page),pages);
  const start=(safe-1)*pageSize;
  return {issue,total:methods.length,page:safe,pages,posts:methods.slice(start,start+pageSize).map((m,index)=>makePost(type,board,category,issue,m,start+index))};
}
