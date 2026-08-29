import ArchivedFormulaPost from '@/app/ArchivedFormulaPost';
import DynamicWuxingPoster from '@/app/DynamicWuxingPoster';
import IssueScroller from '@/app/IssueScroller';
import {formulaManifests,requestedLotteryType} from '@/lib/formula-manifests';
import {LOTTERY_SHORT_NAMES} from '@/lib/lottery';

export default async function WuxingPost({params,searchParams}:{params:Promise<{issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {issue,method}=await params;
  const type=requestedLotteryType(await searchParams);
  const manifest=formulaManifests.wuxing[type];
  const requestedIssue=Number(issue);
  const currentIssue=Number(manifest.issue);
  const index=manifest.methods.findIndex((value:{rank:string})=>value.rank===method);
  const currentItem=index>=0?manifest.methods[index]:undefined;
  if(!currentItem)return <ArchivedFormulaPost type={type} path={`/posts/wuxing/${issue}/${method}`} backHref={`/?type=${type}#board-五行公式`} backLabel="返回五行板块"/>;
  const sourceEntry=currentItem.history?.find((entry:{targetPeriod:number})=>entry.targetPeriod===requestedIssue);
  const isDerivedHistory=requestedIssue<currentIssue&&Boolean(sourceEntry);
  if(requestedIssue!==currentIssue&&!isDerivedHistory)return <ArchivedFormulaPost type={type} path={`/posts/wuxing/${issue}/${method}`} backHref={`/?type=${type}#board-五行公式`} backLabel="返回五行板块"/>;
  const baseItem=isDerivedHistory?{...currentItem,next:sourceEntry.branches.map((branch:{result:string})=>branch.result),branches:sourceEntry.branches.map((branch:{name:string;calculation:string;result:string},branchIndex:number)=>({...currentItem.branches[branchIndex],name:branch.name,next:branch.result,calculation:branch.calculation})),history:currentItem.history.filter((entry:{targetPeriod:number})=>entry.targetPeriod<=requestedIssue),verification:{hit:sourceEntry.hit,actualNumber:sourceEntry.actualNumber,actualAnimal:sourceEntry.actualAnimal,actualElement:sourceEntry.actualElement}}:currentItem;
  const item={...baseItem,history:(baseItem.history||[]).slice(-5)};
  const historyPeriods=(item.history||[]).map((entry:{targetPeriod:number})=>entry.targetPeriod);
  const posterIssue=isDerivedHistory&&historyPeriods.length?`${Math.min(...historyPeriods)}-${Math.max(...historyPeriods)}`:issue;
  const drawCutoff=isDerivedHistory?requestedIssue:requestedIssue-1;
  const draws=manifest.draws.filter((draw:{period:number})=>draw.period<=drawCutoff).slice(-6);
  const candidatePreviousIssue=requestedIssue-1;
  const previousIssue=currentItem.history?.some((entry:{targetPeriod:number})=>entry.targetPeriod===candidatePreviousIssue)?candidatePreviousIssue:null;
  const newerIssue=requestedIssue<currentIssue?requestedIssue+1:null;
  const availableIssues=Array.from(new Set([currentIssue,...(currentItem.history||[]).map((entry:{targetPeriod:number})=>entry.targetPeriod)])).sort((a,b)=>b-a);
  return <main className="post-page">
    <header className="site-header"><a className="brand" href={`/?type=${type}`}>六合公式库</a><nav><a href={`/?type=${type}`}>首页</a><a href={`/?type=${type}#board-五行公式`}>五行公式</a></nav></header>
    <article className="detail pingte-detail">
      <div className="detail-topbar"><a className="detail-back" href={`/?type=${type}#board-五行公式`}><i>←</i><span><small>BACK TO INDEX</small><strong>返回五行板块</strong></span></a><IssueScroller issues={availableIssues} current={requestedIssue} basePath="/posts/wuxing" method={method} type={type}/></div>
      <section className="method-card single-method"><DynamicWuxingPoster issue={posterIssue} item={item} draws={draws} lotteryName={LOTTERY_SHORT_NAMES[type]}/></section>
    </article>
    <footer className="site-footer"><strong>六合公式库</strong><span>FORMULA POSTS · 2026</span></footer>
  </main>;
}
