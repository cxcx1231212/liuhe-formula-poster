import {formulaManifests,requestedLotteryType} from '@/lib/formula-manifests';
import macau239 from '../../../../../public/generated/pingte-two/type-5-239-manifest.json';

export default async function PingteTwoPost({params,searchParams}:{params:Promise<{issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const {issue,method}=await params;
  const type=requestedLotteryType(await searchParams);const current=formulaManifests.pingte2[type];const manifests:Record<string,any>=type==='5'?{'239':macau239,[String(current.issue)]:current}:{[String(current.issue)]:current};const manifest=manifests[issue];const posts=manifest?.methods??[];
  const index=Number(method)-1;
  if(!manifest||!Number.isInteger(index)||index<0||index>=posts.length) return <main className="not-found"><h1>帖子不存在</h1><a href="/">返回首页</a></main>;
  const post=posts[index];
  const animals=post.predictionAnimals.join('、');
  const title=`${post.leftName} ＋ ${post.rightName}`;
  const signature=(item:any)=>`${item.leftName}|${item.rightName}`;const issueKeys=Object.keys(manifests).map(Number).sort((a,b)=>a-b);const issuePosition=issueKeys.indexOf(Number(issue));const linkedIssue=(offset:number)=>{const target=issueKeys[issuePosition+offset];if(!target)return null;const targetIndex=manifests[String(target)].methods.findIndex((item:any)=>signature(item)===signature(post));return targetIndex>=0?{issue:target,method:String(targetIndex+1).padStart(3,'0')}:null};const older=linkedIssue(-1),newer=linkedIssue(1);
  const previous=index>0?String(index).padStart(3,'0'):null;
  const next=index<posts.length-1?String(index+2).padStart(3,'0'):null;
  return <main className="post-page">
    <header className="site-header"><a className="brand" href="/">六合公式库</a><nav><a href="/">首页</a><a href="/#board-平特公式">平特公式</a></nav></header>
    <article className="detail pingte-detail">
      <div className="detail-topbar">
        <a className="detail-back" href={`/?type=${type}#board-平特公式`}><i>←</i><span><small>BACK TO INDEX</small><strong>返回平特板块</strong></span></a>
        <nav className="detail-issue-links">
          {newer?<a href={`/posts/pingte2/${newer.issue}/${newer.method}?type=${type}`}><small>下一期</small><strong>第{newer.issue}期</strong></a>:<span className="disabled"><small>下一期</small><strong>当前最新</strong></span>}
          {older?<a href={`/posts/pingte2/${older.issue}/${older.method}?type=${type}`}><small>上一期</small><strong>第{older.issue}期</strong></a>:<span className="disabled"><small>上一期</small><strong>暂无记录</strong></span>}
        </nav>
      </div>
      <header className="detail-title"><span>平特二肖</span><h1>2026-{issue}期｜参考{animals}</h1></header>
      <section className="method-card single-method"><header className="simple-method-title"><strong>{title}</strong></header><figure className="formula-frame"><img src={`/generated/pingte-two/type-${type}-${String(issue).padStart(3,'0')}-${method}.webp?v=35`} alt={`2026-${issue}期平特一肖${animals}`} draggable="false"/></figure></section>
      <p className="formula-note">平码与特码共7个号码均计入；两个生肖必须在同一期同时出现才记为命中。历史规律仅供娱乐参考。</p>
      <nav className="post-pager">{previous?<a href={`/posts/pingte2/${issue}/${previous}?type=${type}`}><small>上一组二肖</small><strong>{posts[index-1].predictionAnimals.join('、')}</strong></a>:<span/>}{next?<a href={`/posts/pingte2/${issue}/${next}?type=${type}`}><small>下一组二肖</small><strong>{posts[index+1].predictionAnimals.join('、')}</strong></a>:<span/>}</nav>
    </article><footer className="site-footer"><strong>六合公式库</strong><span>FORMULA POSTS · 2026</span></footer>
  </main>;
}
