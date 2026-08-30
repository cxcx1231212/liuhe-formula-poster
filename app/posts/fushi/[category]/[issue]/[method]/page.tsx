import ArchivedFormulaPost from '@/app/ArchivedFormulaPost';
import DynamicWuxingPoster from '@/app/DynamicWuxingPoster';
import IssueScroller from '@/app/IssueScroller';
import {formulaManifests,requestedLotteryType} from '@/lib/formula-manifests';
import {LOTTERY_SHORT_NAMES} from '@/lib/lottery';
import {buildFushiPosterItem,type FushiMethod} from '@/lib/fushi-history';

const meta:Record<string,{label:string;kind:'number'|'animal';required:number}>={
  '22':{label:'二中二',kind:'number',required:2},
  '33':{label:'三中三',kind:'number',required:3},
  '2x':{label:'二连肖',kind:'animal',required:2},
  '3x':{label:'三连肖',kind:'animal',required:3},
};

export default async function FushiPost({params,searchParams}:{params:Promise<{category:string;issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {category,issue,method}=await params;
  const type=requestedLotteryType(await searchParams),manifest=formulaManifests.fushi[type];
  const requestedIssue=Number(issue),currentIssue=Number(manifest.issue),group=manifest.groups?.[category],info=meta[category];
  const index=Number(method)-1,raw=group?.methods?.[index] as FushiMethod|undefined;
  const back=`/?type=${type}#board-复式公式`;
  if(!raw||!info||!Number.isFinite(requestedIssue))return <ArchivedFormulaPost type={type} path={`/posts/fushi/${category}/${issue}/${method}`} backHref={back} backLabel="返回复式板块"/>;
  const minimumIssue=Math.min(...manifest.draws.map((draw:{period:number})=>draw.period))+1;
  const availableIssues:number[]=[currentIssue];
  for(let value=currentIssue-6;value>=minimumIssue;value-=5)availableIssues.push(value);
  if(!availableIssues.includes(requestedIssue))return <ArchivedFormulaPost type={type} path={`/posts/fushi/${category}/${issue}/${method}`} backHref={back} backLabel="返回复式板块"/>;

  const fullItem=buildFushiPosterItem(raw,manifest.draws,requestedIssue,info.kind,info.required,info.label);
  const isHistory=requestedIssue<currentIssue,verified=fullItem.history.find(entry=>entry.targetPeriod===requestedIssue);
  const item=isHistory&&verified?{
    ...fullItem,
    next:verified.branches.map(branch=>branch.result),
    branches:fullItem.branches.map((branch,branchIndex)=>({...branch,next:verified.branches[branchIndex]?.result||branch.next,calculation:verified.branches[branchIndex]?.calculation||branch.calculation})),
    verification:{hit:verified.hit,actualNumber:verified.actualNumber,actualAnimal:verified.actualAnimal,actualElement:verified.actualElement},
  }:fullItem;
  const cutoff=isHistory?requestedIssue:requestedIssue-1;
  const draws=manifest.draws.filter((draw:{period:number})=>draw.period<=cutoff).slice(-6);
  const periods=item.history.map(entry=>entry.targetPeriod),posterIssue=isHistory&&periods.length?`${Math.min(...periods)}-${Math.max(...periods)}`:issue;
  const padded=String(index+1).padStart(3,'0');
  return <main className="post-page"><header className="site-header"><a className="brand" href={`/?type=${type}`}>六合公式库</a><nav><a href={`/?type=${type}`}>首页</a><a href={back}>复式公式</a></nav></header><article className="detail pingte-detail"><div className="detail-topbar"><a className="detail-back" href={back}><i>←</i><span><small>BACK TO INDEX</small><strong>返回复式板块</strong></span></a><IssueScroller issues={availableIssues} current={requestedIssue} basePath={`/posts/fushi/${category}`} method={padded} type={type}/></div><section className="method-card single-method"><DynamicWuxingPoster issue={posterIssue} item={item} draws={draws} mode="fushi" lotteryName={LOTTERY_SHORT_NAMES[type]}/></section></article><footer className="site-footer"><strong>六合公式库</strong><span>FORMULA POSTS · 2026</span></footer></main>;
}
