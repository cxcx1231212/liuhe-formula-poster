import ArchivedFormulaPost from '@/app/ArchivedFormulaPost';
import DynamicWuxingPoster from '@/app/DynamicWuxingPoster';
import {formulaManifests,requestedLotteryType} from '@/lib/formula-manifests';

export default async function WuxingPost({params,searchParams}:{params:Promise<{issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {issue,method}=await params;
  const type=requestedLotteryType(await searchParams);
  const manifest=formulaManifests.wuxing[type];
  const index=manifest.methods.findIndex((value:{rank:string})=>value.rank===method);
  const item=index>=0?manifest.methods[index]:undefined;
  if(issue!==String(manifest.issue)||!item)return <ArchivedFormulaPost type={type} path={`/posts/wuxing/${issue}/${method}`} backHref={`/?type=${type}#board-五行公式`} backLabel="返回五行板块"/>;
  const previous=index>0?manifest.methods[index-1].rank:null;
  const next=index<manifest.methods.length-1?manifest.methods[index+1].rank:null;
  return <main className="post-page">
    <header className="site-header"><a className="brand" href={`/?type=${type}`}>六合公式库</a><nav><a href={`/?type=${type}`}>首页</a><a href={`/?type=${type}#board-五行公式`}>五行公式</a></nav></header>
    <article className="detail pingte-detail">
      <div className="detail-topbar"><a className="detail-back" href={`/?type=${type}#board-五行公式`}><i>←</i><span><small>BACK TO INDEX</small><strong>返回五行板块</strong></span></a><span className="dynamic-poster-badge">动态生成 · 不占图片存储</span></div>
      <header className="detail-title"><span>{item.label}</span><h1>2026-{issue}期｜{item.label}</h1></header>
      <section className="method-card single-method"><DynamicWuxingPoster issue={issue} item={item}/></section>
      <p className="formula-note">本公式图由当前公式数据即时绘制，没有预先保存WebP图片。历史结果仍按固定公式编号连续记录。仅供娱乐参考。</p>
      <nav className="post-pager">{previous?<a href={`/posts/wuxing/${issue}/${previous}?type=${type}`}><small>上一个公式</small><strong>五行 第{index}条</strong></a>:<span/>}{next?<a href={`/posts/wuxing/${issue}/${next}?type=${type}`}><small>下一个公式</small><strong>五行 第{index+2}条</strong></a>:<span/>}</nav>
    </article>
    <footer className="site-footer"><strong>六合公式库</strong><span>FORMULA POSTS · 2026</span></footer>
  </main>;
}
