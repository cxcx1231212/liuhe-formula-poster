import ArchivedFormulaPost from '@/app/ArchivedFormulaPost';
import DynamicWuxingPoster from '@/app/DynamicWuxingPoster';
import {formulaManifests,requestedLotteryType} from '@/lib/formula-manifests';

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
  const item=isDerivedHistory?{
    ...currentItem,
    next:[sourceEntry.branches[0].result],
    branches:[{...currentItem.branches[0],next:sourceEntry.branches[0].result,calculation:`取${sourceLabel?`平码${sourceLabel}`:'号码'}：${historicalCalculation}`}],
    history:currentItem.history.filter((entry:{targetPeriod:number})=>entry.targetPeriod<requestedIssue)
  }:currentItem;
  const draws=isDerivedHistory?manifest.draws.filter((draw:{period:number})=>draw.period<requestedIssue):manifest.draws;
  const previous=index>0?manifest.methods[index-1].rank:null;
  const next=index<manifest.methods.length-1?manifest.methods[index+1].rank:null;
  const candidatePreviousIssue=requestedIssue-1;
  const previousIssue=currentItem.history?.some((entry:{targetPeriod:number})=>entry.targetPeriod===candidatePreviousIssue)?candidatePreviousIssue:null;
  const newerIssue=requestedIssue<currentIssue?requestedIssue+1:null;
  return <main className="post-page">
    <header className="site-header"><a className="brand" href={`/?type=${type}`}>六合公式库</a><nav><a href={`/?type=${type}`}>首页</a><a href={`/?type=${type}#board-家野公式`}>家野公式</a></nav></header>
    <article className="detail pingte-detail">
      <div className="detail-topbar"><a className="detail-back" href={`/?type=${type}#board-家野公式`}><i>←</i><span><small>BACK TO INDEX</small><strong>返回家野板块</strong></span></a><nav className="detail-issue-links" aria-label="期数切换">{newerIssue?<a href={`/posts/jiaye/${newerIssue}/${method}?type=${type}`}><small>下一期</small><strong>{newerIssue}期</strong></a>:<span className="disabled">当前最新</span>}{previousIssue?<a href={`/posts/jiaye/${previousIssue}/${method}?type=${type}`}><small>上一期</small><strong>{previousIssue}期</strong></a>:<span className="disabled">暂无上期</span>}</nav></div>
      <section className="method-card single-method"><DynamicWuxingPoster issue={issue} item={item} draws={draws} mode="jiaye"/></section>
      <aside className="jiaye-note"><p><strong>家肖</strong><span>牛、马、羊、鸡、狗、猪</span></p><p><strong>野肖</strong><span>鼠、虎、兔、龙、蛇、猴</span></p><small>按上期开奖推算下期家野 · 仅供娱乐参考</small></aside>
      <nav className="post-pager">{previous?<a href={`/posts/jiaye/${issue}/${previous}?type=${type}`}><small>上一个公式</small><strong>家野 第{index}条</strong></a>:<span/>}{next?<a href={`/posts/jiaye/${issue}/${next}?type=${type}`}><small>下一个公式</small><strong>家野 第{index+2}条</strong></a>:<span/>}</nav>
    </article>
    <footer className="site-footer"><strong>六合公式库</strong><span>FORMULA POSTS · 2026</span></footer>
  </main>;
}
