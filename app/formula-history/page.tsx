import {formulaHistory} from '@/lib/formula-history';

const names:Record<string,string>={'1':'香港六合彩','5':'澳门六合彩','8':'疯狂天天六合彩'};
const statusText:Record<string,string>={hit:'命中',miss:'未中',pending:'待开奖',unknown:'待核对'};
const predictionText=(value:unknown):string=>{
  const keys=['predictionAnimal','predictionNumber','predictionAnimals','predictionNumbers','animals','numbers','nextAnimal','next','values','outputs','output','prediction','result'];
  const collect=(input:unknown):string[]=>{
    if(input==null||input==='')return [];
    if(Array.isArray(input))return input.flatMap(collect);
    if(typeof input==='object'){const row=input as Record<string,unknown>;return keys.flatMap(key=>collect(row[key]));}
    return typeof input==='string'||typeof input==='number'?[String(input)]:[];
  };
  return [...new Set(collect(value))].join('、')||'暂无预测数据';
};

// history-integrity-build:1cdc4b614c4e2aef

export default async function FormulaHistoryPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const query=await searchParams;const type=typeof query.type==='string'?query.type:'5';const path=typeof query.path==='string'?query.path:'';const history=await formulaHistory(type,path);
  if(!history)return <main className="not-found"><h1>该公式暂无历史记录</h1><p>早期资料尚未建立固定公式编号，后续每期开奖后会自动累积。</p><a href={`/?type=${type}`}>返回首页</a></main>;
  return <main className="formula-history-page"><header className="site-header"><a className="brand" href={`/?type=${type}`}>六合公式库</a><nav><a href={`/?type=${type}`}>首页</a></nav></header><article className="formula-history-shell"><a className="formula-history-back" href={`${path}?type=${type}`}>← 返回当前公式</a><header><span>FORMULA ARCHIVE</span><h1>{history.label}</h1><p>{names[type]} · 固定编号 {history.formulaId} · 共{history.entries.length}期记录</p><small>{history.signature}</small></header><div className="formula-history-list">{history.entries.map(entry=><section className={`formula-history-row ${entry.status}`} key={`${entry.issue}-${entry.formulaId}`}><div className="formula-history-period"><b>{String(entry.issue).padStart(3,'0')}期</b><em>{statusText[entry.status]||'待核对'}</em></div><div className="formula-history-result"><span>当期预测</span><strong>{predictionText(entry.prediction)}</strong>{entry.actual&&<small>开奖结果：特码{String(entry.actual.number).padStart(2,'0')} · {entry.actual.animal}</small>}</div><div className="formula-history-actions">{entry.image&&<img src={entry.image} alt={`${entry.issue}期公式图`}/>}<a href={`/formula-history/archive?type=${type}&path=${encodeURIComponent(entry.href||'')}`}>查看当期</a></div></section>)}</div></article></main>;
}
