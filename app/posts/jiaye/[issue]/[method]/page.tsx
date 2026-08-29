import ArchivedFormulaPost from '@/app/ArchivedFormulaPost';
import DynamicWuxingPoster from '@/app/DynamicWuxingPoster';
import {formulaManifests,requestedLotteryType} from '@/lib/formula-manifests';

export default async function JiayePost({params,searchParams}:{params:Promise<{issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {issue,method}=await params;
  const type=requestedLotteryType(await searchParams);
  const manifest=formulaManifests.jiaye[type];
  const index=manifest.methods.findIndex((value:{rank:string})=>value.rank===method);
  const item=index>=0?manifest.methods[index]:undefined;
  if(issue!==String(manifest.issue)||!item)return <ArchivedFormulaPost type={type} path={`/posts/jiaye/${issue}/${method}`} backHref={`/?type=${type}#board-家野公式`} backLabel="返回家野板块"/>;
  const previous=index>0?manifest.methods[index-1].rank:null;
  const next=index<manifest.methods.length-1?manifest.methods[index+1].rank:null;
  return <main className="post-page">
    <header className="site-header"><a className="brand" href={`/?type=${type}`}>六合公式库</a><nav><a href={`/?type=${type}`}>首页</a><a href={`/?type=${type}#board-家野公式`}>家野公式</a></nav></header>
    <article className="detail pingte-detail">
      <div className="detail-topbar"><a className="detail-back" href={`/?type=${type}#board-家野公式`}><i>←</i><span><small>BACK TO INDEX</small><strong>返回家野板块</strong></span></a><a className="dynamic-poster-badge" href={`/formula-history?type=${type}&path=${encodeURIComponent(`/posts/jiaye/${issue}/${method}`)}`}>期数切换</a></div>
      <section className="method-card single-method"><DynamicWuxingPoster issue={issue} item={item} draws={manifest.draws} mode="jiaye"/></section>
      <p className="formula-note">家肖：牛、马、羊、鸡、狗、猪；野肖：鼠、虎、兔、龙、蛇、猴。使用上一期开奖计算下一期家野，仅供娱乐参考。</p>
      <nav className="post-pager">{previous?<a href={`/posts/jiaye/${issue}/${previous}?type=${type}`}><small>上一个公式</small><strong>家野 第{index}条</strong></a>:<span/>}{next?<a href={`/posts/jiaye/${issue}/${next}?type=${type}`}><small>下一个公式</small><strong>家野 第{index+2}条</strong></a>:<span/>}</nav>
    </article>
    <footer className="site-footer"><strong>六合公式库</strong><span>FORMULA POSTS · 2026</span></footer>
  </main>;
}
