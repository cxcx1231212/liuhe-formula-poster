import {formulaHistory} from '@/lib/formula-history';

const names:Record<string,string>={'1':'香港六合彩','5':'澳门六合彩','8':'疯狂天天六合彩'};

export default async function ArchivedFormulaPost({type,path,backHref='/',backLabel='返回公式板块'}:{type:string;path:string;backHref?:string;backLabel?:string}){
  const history=await formulaHistory(type,path);
  const item=history?.entries.find(entry=>entry.href===path)??null;
  if(!item||!history)return <main className="not-found"><h1>帖子不存在</h1><a href="/">返回首页</a></main>;
  const position=history.entries.findIndex(entry=>entry.href===path);
  const newer=position>0?history.entries[position-1]:null;
  const older=position<history.entries.length-1?history.entries[position+1]:null;
  return <main className="post-page">
    <header className="site-header"><a className="brand" href="/">六合公式库</a><nav><a href="/">首页</a></nav></header>
    <article className="detail pingte-detail">
      <div className="detail-topbar"><a className="detail-back" href={backHref}><i>←</i><span><small>BACK TO INDEX</small><strong>{backLabel}</strong></span></a><nav className="detail-issue-links">{newer?.href?<a href={`${newer.href}?type=${type}`}><small>下一期</small><strong>{newer.issue}期</strong></a>:<span className="disabled">当前最新</span>}{older?.href?<a href={`${older.href}?type=${type}`}><small>上一期</small><strong>{older.issue}期</strong></a>:<span className="disabled">暂无上期</span>}</nav></div>
      <header className="detail-title detail-title-rich"><div className="detail-title-copy"><p><span>{names[type]??names['5']}</span><b>历史公式</b><time>2026-{item.issue}期</time></p><h1>{item.label||history.label}</h1><small>历史档案 · 已按同一公式连续保存</small></div><em>{String(item.issue).padStart(3,'0')}</em></header>
      <section className="method-card single-method"><header className="simple-method-title"><strong>{item.label||history.label}</strong></header>{item.image?<figure className="formula-frame"><img src={item.image} alt={`${item.issue}期历史公式图`} draggable="false"/></figure>:<p className="formula-note">本期历史计算记录已保存。</p>}</section>
      <p className="formula-note">本页为该公式当期原始存档，开奖结果公布后自动记录命中状态。仅供娱乐参考。</p>
      <a className="history-inline-link" href={`/formula-history?type=${type}&path=${encodeURIComponent(path)}`}>查看这个公式的全部历史记录</a>
    </article>
  </main>;
}
