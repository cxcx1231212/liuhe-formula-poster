import {postAuthor} from '@/lib/post-authors';
import type {BoardPost} from '@/app/BoardPostList';
const oneTitles=['历史轨迹完整公开','平码尾数实战参考','连续命中规律分享','下期特肖重点参考','平码推演清晰易懂','合数公式逐期验证','精选公式稳定追踪','独家思路免费公开','七码总分规律解析','本期规律参考分享'];
const twoTitles=['双肖同时开轨迹公开','两条公式同步验证','平码特码全部计入','双支公式清楚易懂','历史同期开出参考','两肖组合重点分享','逐期双线轨迹整理','精选双肖免费公开','双肖规律手机大字图','本期两肖参考分享'];
const common=['精准单支公式公开','多支组合逐项计算','历史轨迹清楚整理','本期号码重点参考','手机大字公式分享','全部公式自动筛选'];
const zodiacS=['特肖轨迹长期追踪','高准确率公式公开','历史表现自动排名','本期精选生肖参考','逐期回测清楚展示','手机大字图免费分享'];
const fushiS=['高准确率复式公开','历史表现自动排名','逐期回测清楚展示','本期精选组合参考','手机大字图免费分享','长期追踪及时更新'];
const dsS=['特码单双连准公开','简单加减清楚易懂','历史轨迹逐期验证','本期特单双重点参考','精选规律长期追踪'];
const waveS=['特码波色连准公开','红蓝绿波清楚展示','简单加减逐期验证','本期特波重点参考','精选规律长期追踪'];
const wxS=['特五行连准公开','简单算法逐期验证','本期五行重点参考','精选规律长期追踪'];
const jyS=['家野中特规律公开','生肖家野清楚展示','简单算法逐期验证','本期家野重点参考'];
const pad=(v:number|string)=>String(v).padStart(3,'0');
export function makeHomeBoardPost(type:string,board:string,category:string,issue:number,m:Record<string,unknown>,index:number):BoardPost{
 index=typeof m.sourceIndex==='number'?m.sourceIndex:index;
 const q=`?type=${type}`,rank=String(m.rank??pad(index+1)),i=`${issue}期`;
 if(board==='pingte'){const two=category==='two';return {issue:i,href:`/posts/${two?'pingte2':'pingte'}/${issue}/${pad(index+1)}${q}`,title:`${postAuthor(type,two?'pingte2':'pingte',index)}【${two?'平特二肖':'平特一肖'}】${(two?twoTitles:oneTitles)[index%10]}`};}
 if(board==='tema'){const label:Record<string,string>={'3':'三码中特','8':'八码中特','10':'十码中特','18':'十八码中特'};return {issue:i,href:`/posts/tema/${category}/${issue}/${pad(index+1)}${q}`,title:`${postAuthor(type,`tema${category}` as never,index)}【${label[category]}】${common[index%common.length]}`};}
 if(board==='zodiac'){const label:Record<string,string>={'1':'一肖','3':'三肖','6':'六肖','9':'九肖'};return {issue:i,href:`/posts/zodiac/${category}/${issue}/${pad(index+1)}${q}`,title:`${postAuthor(type,`zodiac${category}` as never,index)}【${label[category]}中特】${zodiacS[index%zodiacS.length]}`};}
 if(board==='fushi'){const label:Record<string,string>={'22':'二中二','33':'三中三','2x':'二连肖','3x':'三连肖'};return {issue:i,href:`/posts/fushi/${category}/${issue}/${rank}${q}`,title:`${postAuthor(type,`fushi${category}` as never,index)}【${label[category]}】${fushiS[index%fushiS.length]}`};}
 if(board==='danshuang')return {issue:i,href:`/posts/danshuang/${issue}/${rank}${q}`,title:`${postAuthor(type,'danshuang',index)}【${String(m.label??'')}】${dsS[index%dsS.length]}`};
 if(board==='wave')return {issue:i,href:`/posts/wave/${issue}/${rank}${q}`,title:`${postAuthor(type,'wave',index)}【特码波色】${waveS[index%waveS.length]}`};
 if(board==='wuxing')return {issue:i,href:`/posts/wuxing/${issue}/${rank}${q}`,title:`${postAuthor(type,'wuxing',index)}【${String(m.label??'')}】${wxS[index%wxS.length]}`};
 if(board==='jiaye')return {issue:i,href:`/posts/jiaye/${issue}/${rank}${q}`,title:`${postAuthor(type,'jiaye',index)}【家野中特】${jyS[index%jyS.length]}`};
 if(board==='kill'){const label:Record<string,string>={code:'杀码',animal:'杀肖',tail:'杀尾',head:'杀头',wave:'杀波'};return {issue:i,href:`/posts/kill/${category}/${issue}/${rank}${q}`,title:`${postAuthor(type,`kill${category}` as never,index)}【${label[category]}】本期规律参考分享`};}
 if(board==='size')return {issue:i,href:`/posts/size/${issue}/${rank}${q}`,title:`${postAuthor(type,'size',index)}【特码大小】${String(m.name??'公式参考')}`};
 return {issue:i,href:`/posts/${board}/${issue}/${rank}${q}`,title:`${postAuthor(type,board as never,index)}【${String(m.label??'')}】每期公式完整公开`};
}
