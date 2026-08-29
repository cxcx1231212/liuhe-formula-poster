import ArchivedFormulaPost from '@/app/ArchivedFormulaPost';
import DynamicWuxingPoster from '@/app/DynamicWuxingPoster';
import {formulaManifests,requestedLotteryType} from '@/lib/formula-manifests';

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
  const baseItem=isDerivedHistory?{...currentItem,next:sourceEntry.branches.map((branch:{result:string})=>branch.result),branches:sourceEntry.branches.map((branch:{name:string;calculation:string;result:string},branchIndex:number)=>({...currentItem.branches[branchIndex],name:branch.name,next:branch.result,calculation:branch.calculation})),history:currentItem.history.filter((entry:{targetPeriod:number})=>entry.targetPeriod<requestedIssue),verification:{hit:sourceEntry.hit,actualNumber:sourceEntry.actualNumber,actualAnimal:sourceEntry.actualAnimal,actualElement:sourceEntry.actualElement}}:currentItem;
  const item={...baseItem,history:(baseItem.history||[]).slice(-4)};
  const draws=manifest.draws.filter((draw:{period:number})=>draw.period<requestedIssue).slice(-5);
  const candidatePreviousIssue=requestedIssue-1;
  const previousIssue=currentItem.history?.some((entry:{targetPeriod:number})=>entry.targetPeriod===candidatePreviousIssue)?candidatePreviousIssue:null;
  const newerIssue=requestedIssue<currentIssue?requestedIssue+1:null;
  return <main className="post-page">
    <header className="site-header"><a className="brand" href={`/?type=${type}`}>六合公式库</a><nav><a href={`/?type=${type}`}>首页</a><a href={`/?type=${type}#board-五行公式`}>五行公式</a></nav></header>
    <article className="detail pingte-detail">
      <div className="detail-topbar"><a className="detail-back" href={`/?type=${type}#board-五行公式`}><i>←</i><span><small>BACK TO INDEX</small><strong>返回五行板块</strong></span></a><nav className="detail-issue-links" aria-label="期数切换">{newerIssue?<a href={`/posts/wuxing/${newerIssue}/${method}?type=${type}`}><small>下一期</small><strong>{newerIssue}期</strong></a>:<span className="disabled">当前最新</span>}{previousIssue?<a href={`/posts/wuxing/${previousIssue}/${method}?type=${type}`}><small>上一期</small><strong>{previousIssue}期</strong></a>:<span className="disabled">暂无上期</span>}</nav></div>
      <section className="method-card single-method"><DynamicWuxingPoster issue={issue} item={item} draws={draws}/></section>
    </article>
    <footer className="site-footer"><strong>六合公式库</strong><span>FORMULA POSTS · 2026</span></footer>
  </main>;
}
