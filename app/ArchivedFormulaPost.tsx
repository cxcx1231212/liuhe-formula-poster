import {formulaHistory} from '@/lib/formula-history';

const names:Record<string,string>={'1':'香港六合彩','5':'澳门六合彩','8':'疯狂天天六合彩'};
const fieldNames:Record<string,string>={numbers:'本期号码',number:'本期号码',animals:'本期生肖',animal:'本期生肖',tails:'本期尾数',tail:'本期尾数',heads:'本期头数',head:'本期头数',waves:'本期波色',wave:'本期波色',elements:'本期五行',element:'本期五行',values:'本期结果',value:'本期结果',result:'本期结果',next:'本期预测',prediction:'本期预测',calculation:'计算过程',source:'取数来源'};

function valueText(value:unknown):string{
  if(value===null||value===undefined||value==='')return '—';
  if(Array.isArray(value))return value.map(valueText).join('、');
  if(typeof value==='object')return Object.entries(value as Record<string,unknown>).map(([key,item])=>(fieldNames[key]||key)+'：'+valueText(item)).join('；');
  return String(value);
}

export default async function ArchivedFormulaPost({type,path,backHref='/',backLabel='返回公式板块'}:{type:string;path:string;backHref?:string;backLabel?:string}){
  const history=await formulaHistory(type,path);
  const item=history?.entries.find(entry=>entry.href===path)??null;
  if(!item||!history)return <main className="not-found"><h1>帖子不存在</h1><a href="/">返回首页</a></main>;
  const position=history.entries.findIndex(entry=>entry.href===path);
  const newer=position>0?history.entries[position-1]:null;
  const older=position<history.entries.length-1?history.entries[position+1]:null;
  const predictions=Object.entries(item.prediction??{}).filter(([,value])=>value!==null&&value!==undefined&&value!=='');
  return <main className="post-page">
    <header className="site-header"><a className="brand" href="/">六合公式库</a><nav><a href="/">首页</a></nav></header>
    <article className="detail pingte-detail">
      <div className="detail-topbar"><a className="detail-back" href={backHref}><i>←</i><span><small>BACK TO INDEX</small><strong>{backLabel}</strong></span></a><nav className="detail-issue-links">{newer?.href?<a href={newer.href+'?type='+type}><small>下一期</small><strong>{newer.issue}期</strong></a>:<span className="disabled">当前最新</span>}{older?.href?<a href={older.href+'?type='+type}><small>上一期</small><strong>{older.issue}期</strong></a>:<span className="disabled">暂无上期</span>}</nav></div>
      <header className="detail-title detail-title-rich"><div className="detail-title-copy"><p><span>{names[type]??names['5']}</span><b>历史公式</b><time>2026-{item.issue}期</time></p><h1>{item.label||history.label}</h1><small>历史档案 · 已按同一公式连续保存</small></div><em>{String(item.issue).padStart(3,'0')}</em></header>
      <section className="method-card single-method"><header className="simple-method-title"><strong>{item.label||history.label}</strong></header><div style={{display:'grid',gap:'12px',padding:'18px'}}><p><b>公式算法：</b>{item.signature||history.signature}</p>{predictions.length?predictions.map(([key,value])=><p key={key}><b>{fieldNames[key]||key}：</b>{valueText(value)}</p>):<p className="formula-note">本期公式数据已保存，暂无单独预测字段。</p>}<p><b>公式编号：</b>{item.formulaId}</p>{item.actual?<p><b>开奖结果：</b>{item.actual.number}（{item.actual.animal}）</p>:<p><b>开奖结果：</b>等待开奖</p>}</div></section>
      <p className="formula-note">本页为该公式当期原始存档，开奖结果公布后自动记录命中状态。仅供娱乐参考。</p>
      <a className="history-inline-link" href={'/formula-history?type='+type+'&path='+encodeURIComponent(path)}>查看这个公式的全部历史记录</a>
    </article>
  </main>;
}
