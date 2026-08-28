import {formulaManifests,requestedLotteryType} from '@/lib/formula-manifests';
import {postAuthor} from '@/lib/post-authors';
import macau239 from '../../../../../public/generated/pingte-all/type-5-239-manifest.json';

const lotteryNames:Record<string,string>={'1':'香港六合彩','5':'澳门六合彩','8':'疯狂天天六合彩'};
const slogans=['历史轨迹完整公开','平码尾数实战参考','连续命中规律分享','下期特肖重点参考','平码推演清晰易懂','合数公式逐期验证','精选公式稳定追踪','独家思路免费公开','七码总分规律解析','本期规律参考分享'];

export default async function PingteMethodPost({params,searchParams}:{params:Promise<{issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const {issue,method} = await params;
  const type=requestedLotteryType(await searchParams);const current=formulaManifests.pingte[type];
  const manifests:Record<string,any>=type==='5'?{'239':macau239,[String(current.issue)]:current}:{[String(current.issue)]:current};
  const manifest=manifests[issue];const methods=manifest?.methods??[];
  const index = Number(method)-1;
  if (!manifest || !Number.isInteger(index) || index < 0 || index >= methods.length) {
    return <main className="not-found"><h1>帖子不存在</h1><a href="/">返回首页</a></main>;
  }
  const name = methods[index].name;
  const issueKeys=Object.keys(manifests).map(Number).sort((a,b)=>a-b);const issuePosition=issueKeys.indexOf(Number(issue));
  const linkedIssue=(offset:number)=>{const target=issueKeys[issuePosition+offset];if(!target)return null;const targetIndex=manifests[String(target)].methods.findIndex((item:any)=>item.name===name);return targetIndex>=0?{issue:target,method:String(targetIndex+1).padStart(3,'0')}:null};
  const older=linkedIssue(-1),newer=linkedIssue(1);
  const currentIndex=current.methods.findIndex((item:any)=>item.name===name);const authorIndex=currentIndex>=0?currentIndex:index;
  const author=postAuthor(type,'pingte',authorIndex);const postTitle=`${author}【平特一肖】${slogans[authorIndex%slogans.length]}`;
  const previous = index > 0 ? String(index).padStart(3,'0') : null;
  const next = index < methods.length-1 ? String(index+2).padStart(3,'0') : null;
  return <main className="post-page">
    <header className="site-header"><a className="brand" href="/">六合公式库</a><nav><a href="/">首页</a><a href="/#board-平特公式">平特公式</a></nav></header>
    <article className="detail pingte-detail">
      <div className="detail-topbar"><a className="detail-back" href={`/?type=${type}#board-平特公式`}><i>←</i><span><small>BACK TO INDEX</small><strong>返回平特板块</strong></span></a><nav className="detail-issue-links">{newer?<a href={`/posts/pingte/${newer.issue}/${newer.method}?type=${type}`}><small>下一期</small><strong>{newer.issue}期</strong></a>:<span className="disabled">当前最新</span>}{older?<a href={`/posts/pingte/${older.issue}/${older.method}?type=${type}`}><small>上一期</small><strong>{older.issue}期</strong></a>:<span className="disabled">暂无上期</span>}</nav></div>
      <header className="detail-title detail-title-rich"><div className="detail-title-copy"><p><span>{lotteryNames[type]}</span><b>平特一肖</b><time>2026-{issue}期</time></p><h1>{postTitle}</h1><small>本期公式：{name}</small></div><em>{String(issue).padStart(3,'0')}</em></header>
      <section className="method-card single-method">
        <header className="simple-method-title"><strong>{name}</strong></header>
        <figure className="formula-frame"><img src={`/generated/pingte-all/type-${type}-${String(issue).padStart(3,'0')}-${method}.webp?v=35`} alt={`方法${method}：${name}`} draggable="false" /></figure>
      </section>
      <p className="formula-note">依据前期开奖数据逐期推算，红线标出公式来源与下期对应结果。历史规律仅供娱乐参考。</p>
      <nav className="post-pager">
        {previous?<a href={`/posts/pingte/${issue}/${previous}?type=${type}`}><small>上一个公式</small><strong>{methods[index-1].name}</strong></a>:<span/>}
        {next?<a href={`/posts/pingte/${issue}/${next}?type=${type}`}><small>下一个公式</small><strong>{methods[index+1].name}</strong></a>:<span/>}
      </nav>
    </article>
    <footer className="site-footer"><strong>六合公式库</strong><span>FORMULA POSTS · 2026</span></footer>
  </main>;
}
