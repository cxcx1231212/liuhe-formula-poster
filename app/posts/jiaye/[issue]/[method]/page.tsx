import ArchivedFormulaPost from '@/app/ArchivedFormulaPost';
import DynamicWuxingPoster from '@/app/DynamicWuxingPoster';
import IssueScroller from '@/app/IssueScroller';
import {formulaManifests,requestedLotteryType} from '@/lib/formula-manifests';
import {LOTTERY_SHORT_NAMES} from '@/lib/lottery';

export default async function JiayePost({params,searchParams}:{params:Promise<{issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {issue,method}=await params;
  const type=requestedLotteryType(await searchParams);
  const manifest=formulaManifests.jiaye[type];
  const requestedIssue=Number(issue);
  const currentIssue=Number(manifest.issue);
  const index=manifest.methods.findIndex((value:{rank:string})=>value.rank===method);
  const currentItem=index>=0?manifest.methods[index]:undefined;
  if(!currentItem)return <ArchivedFormulaPost type={type} path={`/posts/jiaye/${issue}/${method}`} backHref={`/?type=${type}#board-家野公式`} backLabel="返回家野板块"/>;
  const sourceEntry=currentItem.history?.find((entry:{targetPeriod:number})=>entry.targetPeriod===requestedIssue);
  const isDerivedHistory=requestedIssue<currentIssue&&Boolean(sourceEntry);
  if(requestedIssue!==currentIssue&&!isDerivedHistory)return <ArchivedFormulaPost type={type} path={`/posts/jiaye/${issue}/${method}`} backHref={`/?type=${type}#board-家野公式`} backLabel="返回家野板块"/>;
  const historicalCalculation=sourceEntry?.branches?.[0]?.calculation?.replace('｜','，').replace('·','＝')||'';
  const sourceLabel=currentItem.name?.match(/平([1-6])码/)?.[1];
  const baseItem=isDerivedHistory?{
    ...currentItem,
    next:[sourceEntry.branches[0].result],
    branches:[{...currentItem.branches[0],next:sourceEntry.branches[0].result,calculation:`取${sourceLabel?`平码${sourceLabel}`:'号码'}：${historicalCalculation}`}],
    history:currentItem.history.filter((entry:{targetPeriod:number})=>entry.targetPeriod<=requestedIssue),
    verification:{hit:sourceEntry.hit,actualNumber:sourceEntry.actualNumber,actualAnimal:sourceEntry.actualAnimal,actualElement:sourceEntry.actualElement}
  }:currentItem;
  const item={...baseItem,history:(baseItem.history||[]).slice(isDerivedHistory?-5:-4)};
  const drawCutoff=isDerivedHistory?requestedIssue:requestedIssue-1;
  const draws=manifest.draws.filter((draw:{period:number})=>draw.period<=drawCutoff).slice(isDerivedHistory?-6:-5);
  const candidatePreviousIssue=requestedIssue-1;
  const previousIssue=currentItem.history?.some((entry:{targetPeriod:number})=>entry.targetPeriod===candidatePreviousIssue)?candidatePreviousIssue:null;
  const newerIssue=requestedIssue<currentIssue?requestedIssue+1:null;
  const availableIssues=Array.from(new Set([currentIssue,...(currentItem.history||[]).map((entry:{targetPeriod:number})=>entry.targetPeriod)])).sort((a,b)=>b-a);
  return <main className="post-page">
    <header className="site-header"><a className="brand" href={`/?type=${type}`}>六合公式库</a><nav><a href={`/?type=${type}`}>首页</a><a href={`/?type=${type}#board-家野公式`}>家野公式</a></nav></header>
    <article className="detail pingte-detail">
      <div className="detail-topbar"><a className="detail-back" href={`/?type=${type}#board-家野公式`}><i>←</i><span><small>BACK TO INDEX</small><strong>返回家野板块</strong></span></a><IssueScroller issues={availableIssues} current={requestedIssue} basePath="/posts/jiaye" method={method} type={type}/></div>
      <section className="method-card single-method"><DynamicWuxingPoster issue={issue} item={item} draws={draws} mode="jiaye" lotteryName={LOTTERY_SHORT_NAMES[type]}/></section>
      <aside className="jiaye-note"><p><strong>家肖</strong><span>牛、马、羊、鸡、狗、猪</span></p><p><strong>野肖</strong><span>鼠、虎、兔、龙、蛇、猴</span></p></aside>
    </article>
    <footer className="site-footer"><strong>六合公式库</strong><span>FORMULA POSTS · 2026</span></footer>
  </main>;
}
