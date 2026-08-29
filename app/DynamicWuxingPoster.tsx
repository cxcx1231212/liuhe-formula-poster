import './DynamicWuxingPoster.css';

type Branch={name:string;next:string;calculation?:string;sourcePositions?:number[]};
type Validation={sourcePeriod:number;targetPeriod:number;branches:{name:string;calculation:string;result:string}[];actualNumber:string;actualAnimal:string;actualElement:string;hit:boolean};
type Method={label:string;sourceKey:string;next:string[];recentStreak:number;recent30Hits:number;branches:Branch[];history?:Validation[];formulaId?:string;verification?:{hit:boolean;actualNumber:string;actualAnimal:string;actualElement:string}};
type Draw={period:number;displayPeriod?:string;date?:string;numbers:{number:string;animal:string;element:string}[]};

const colors:Record<string,string>={金:'#b78934',木:'#24814a',水:'#247cae',火:'#c73538',土:'#85542f',家肖:'#bd8127',野肖:'#278452'};

export default function DynamicWuxingPoster({issue,item,draws=[],mode='wuxing'}:{issue:string;item:Method;draws?:Draw[];mode?:'wuxing'|'jiaye'}){
  const sourcePositions=new Set([...item.sourceKey,...item.branches.flatMap(branch=>[...branch.name])].join('').match(/平[1-6]码|特码/g)||[]);
  const orderedDraws=draws.slice().sort((a,b)=>b.period-a.period);
  const validations=(item.history||[]).slice().sort((a,b)=>b.targetPeriod-a.targetPeriod);
  const boardOffset=item.verification?58:178;
  const columnX=(position:number)=>112+(position+.5)*126;
  const rowY=(period:number)=>boardOffset+(orderedDraws.findIndex(draw=>draw.period===period)+.5)*104;
  return <section className={`dynamic-poster ${mode}`} aria-label={`${issue}期${item.label}动态公式图`}>
    <div className="dynamic-poster-watermark" aria-hidden="true">六合公式库　六合公式库　六合公式库<br/>六合公式库　六合公式库　六合公式库<br/>六合公式库　六合公式库　六合公式库</div>
    <header><h2>2026-{issue}期 · {item.label}</h2><p>{item.sourceKey}</p></header>
    <div className="wuxing-board-wrap">
    {draws.length>0&&<div className="wuxing-line-board"><div className="wuxing-board-head"><b>期号</b>{['平1码','平2码','平3码','平4码','平5码','平6码','特码'].map(label=><b key={label}>{label}</b>)}</div>{!item.verification&&<div className="wuxing-forecast-row"><strong>{issue}期{mode!=='jiaye'&&<small>下期预测</small>}</strong><div><span>{mode==='jiaye'?'家野预测':'五行参考'}</span>{mode!=='jiaye'&&item.next.map(value=><b key={value} style={{backgroundColor:colors[value]||'#9b772e'}}>{value}</b>)}</div></div>}{orderedDraws.map(draw=><div className="wuxing-board-row" key={draw.period}><strong>{draw.displayPeriod||`${String(draw.period).padStart(3,'0')}期`}<small>{draw.date||''}</small></strong>{draw.numbers.map((value,index)=>{const label=index===6?'特码':`平${index+1}码`;const isSource=sourcePositions.has(label)&&validations.some(entry=>entry.sourcePeriod===draw.period);const isTarget=index===6&&validations.some(entry=>entry.targetPeriod===draw.period);return <span className={`${isSource?'picked ':''}${isTarget?'target ':''}`} key={`${draw.period}-${index}`}><b>{value.number}</b><small>{value.animal} · {value.element}</small></span>})}</div>)}<svg className="wuxing-board-lines" viewBox={`0 0 1000 ${boardOffset+orderedDraws.length*104}`} preserveAspectRatio="none" aria-hidden="true"><defs><marker id="wuxing-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 Z" fill="#cf2f32"/></marker></defs>{validations.map((entry,index)=>{const positions=item.branches[index%item.branches.length]?.sourcePositions||item.branches[0]?.sourcePositions||[];const sy=rowY(entry.sourcePeriod);const ty=rowY(entry.targetPeriod);const tx=columnX(6);const joinX=tx-56;const joinY=(sy+ty)/2;return <g key={`${entry.sourcePeriod}-${entry.targetPeriod}`}>{positions.map(position=><path key={position} d={`M ${columnX(position)} ${sy-18} C ${columnX(position)} ${joinY+18}, ${joinX-28} ${joinY+12}, ${joinX} ${joinY}`} />)}<path d={`M ${joinX} ${joinY} C ${joinX+28} ${joinY-8}, ${tx} ${ty+30}, ${tx} ${ty+7}`} markerEnd="url(#wuxing-arrow)"/><foreignObject x="432" y={joinY-18} width="425" height="42"><div className="wuxing-line-label"><span>{entry.branches.map(branch=>branch.calculation).join('　')}</span><i className={entry.hit?'hit':'miss'}>{entry.hit?'准':'错'}</i></div></foreignObject></g>})}</svg></div>}
    {!item.verification&&<div className="wuxing-formula-note"><b>公式算法</b>{item.branches.map((branch,index)=><span key={`${branch.name}-${index}`}>{branch.calculation||branch.name}</span>)}</div>}
    </div>
    <footer><span>公式编号：{item.formulaId||'自动编号'}</span><strong>近30期命中 {item.recent30Hits} 次</strong><em>仅供娱乐参考</em></footer>
  </section>;
}
