import ArchivedFormulaPost from '@/app/ArchivedFormulaPost';
import DynamicWuxingPoster from '@/app/DynamicWuxingPoster';
import IssueScroller from '@/app/IssueScroller';
import {getZodiacManifest,requestedLotteryType} from '@/lib/zodiac-manifests';
import {LOTTERY_SHORT_NAMES} from '@/lib/lottery';
import {buildZodiacPosterItem,type ZodiacMethod} from '@/lib/zodiac-history';
import {postAuthor} from '@/lib/post-authors';

// Read one lottery and one zodiac-size manifest per page.
const labels:Record<string,string>={'1':'一肖','3':'三肖','6':'六肖','9':'九肖'};

export default async function ZodiacPost({params,searchParams}:{params:Promise<{size:string;issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {size,issue,method}=await params;const type=requestedLotteryType(await searchParams);const manifest=await getZodiacManifest(type,size);
  const requestedIssue=Number(issue),currentIssue=Number(manifest.issue),index=Number(method)-1;
  const group=manifest.group;const raw=group?.methods?.[index] as ZodiacMethod|undefined;const label=labels[size];
  const back=`/?type=${type}#board-生肖公式`;
  if(!raw||!label||!Number.isFinite(requestedIssue))return <ArchivedFormulaPost type={type} path={`/posts/zodiac/${size}/${issue}/${method}`} backHref={back} backLabel="返回生肖板块"/>;
  const minimumIssue=Math.min(...manifest.draws.map((draw:{period:number})=>draw.period))+1;
  const availableIssues:number[]=[];for(let value=currentIssue;value>=minimumIssue;value--)availableIssues.push(value);
  if(!availableIssues.includes(requestedIssue))return <ArchivedFormulaPost type={type} path={`/posts/zodiac/${size}/${issue}/${method}`} backHref={back} backLabel="返回生肖板块"/>;
  const fullItem=buildZodiacPosterItem(raw,manifest.draws,requestedIssue);
  const isHistory=requestedIssue<currentIssue;const verified=fullItem.history.find(entry=>entry.targetPeriod===requestedIssue);
  const item=isHistory&&verified?{...fullItem,next:verified.branches.map(branch=>branch.result),branches:fullItem.branches.map((branch,index)=>({...branch,next:verified.branches[index]?.result||branch.next,calculation:verified.branches[index]?.calculation||branch.calculation})),verification:{hit:verified.hit,actualNumber:verified.actualNumber,actualAnimal:verified.actualAnimal,actualElement:verified.actualElement}}:fullItem;
  const cutoff=isHistory?requestedIssue:requestedIssue-1;const draws=manifest.draws.filter((draw:{period:number})=>draw.period<=cutoff).slice(-6);
  const periods=item.history.map(entry=>entry.targetPeriod);const posterIssue=isHistory&&periods.length?`${Math.min(...periods)}-${Math.max(...periods)}`:issue;
  const padded=String(index+1).padStart(3,'0');
  return <main className="post-page"><header className="site-header"><a className="brand" href={`/?type=${type}`}>六合公式库</a><nav><a href={`/?type=${type}`}>首页</a><a href={back}>生肖公式</a></nav></header><article className="detail pingte-detail"><div className="detail-topbar"><a className="detail-back" href={back}><i>←</i><span><small>BACK TO INDEX</small><strong>返回生肖板块</strong></span></a><IssueScroller issues={availableIssues} current={requestedIssue} basePath={`/posts/zodiac/${size}`} method={padded} type={type}/></div><section className="method-card single-method"><DynamicWuxingPoster issue={posterIssue} item={item} draws={draws} mode="zodiac" lotteryName={LOTTERY_SHORT_NAMES[type]} authorName={postAuthor(type,`zodiac${size}` as never,index)}/></section></article><footer className="site-footer"><strong>六合公式库</strong><span>FORMULA POSTS · 2026</span></footer></main>;
}

