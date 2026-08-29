import './DynamicWuxingPoster.css';

type Branch={name:string;next:string;calculation?:string;sourcePositions?:number[]};
type Validation={sourcePeriod:number;targetPeriod:number;branches:{name:string;calculation:string;result:string}[];actualNumber:string;actualAnimal:string;actualElement:string;hit:boolean};
type Method={label:string;sourceKey:string;next:string[];recentStreak:number;recent30Hits:number;branches:Branch[];history?:Validation[];formulaId?:string};
type Draw={period:number;date?:string;numbers:{number:string;animal:string;element:string}[]};

const colors:Record<string,string>={金:'#b78934',木:'#24814a',水:'#247cae',火:'#c73538',土:'#85542f'};

export default function DynamicWuxingPoster({issue,item,draws=[]}:{issue:string;item:Method;draws?:Draw[]}){
  const sourcePositions=new Set([...item.sourceKey,...item.branches.flatMap(branch=>[...branch.name])].join('').match(/平[1-6]码|特码/g)||[]);
  return <section className="dynamic-poster" aria-label={`${issue}期${item.label}动态公式图`}>
    <div className="dynamic-poster-watermark" aria-hidden="true">六合公式库　六合公式库　六合公式库<br/>六合公式库　六合公式库　六合公式库<br/>六合公式库　六合公式库　六合公式库</div>
    <header><small>六合公式库 · 动态公式图</small><h2>2026-{issue}期 · {item.label}</h2><p>{item.sourceKey}</p></header>
    <div className="dynamic-poster-prediction"><span>下期参考</span><div>{item.next.map(value=><b key={value} style={{backgroundColor:colors[value]||'#9b772e'}}>特{value}</b>)}</div></div>
    {draws.length>0&&<div className="dynamic-draws"><div className="dynamic-draw-head"><b>期号</b>{['平1码','平2码','平3码','平4码','平5码','平6码','特码'].map(label=><b className={sourcePositions.has(label)?'source':''} key={label}>{label}{sourcePositions.has(label)&&<small>取号</small>}</b>)}</div>{draws.slice().reverse().map(draw=><div className="dynamic-draw-row" key={draw.period}><strong>{String(draw.period).padStart(3,'0')}期</strong>{draw.numbers.map((value,index)=>{const label=index===6?'特码':`平${index+1}码`;return <span className={sourcePositions.has(label)?'source':''} key={`${draw.period}-${index}`}><b>{value.number}</b><small>{value.animal} · {value.element}</small></span>})}</div>)}</div>}
    <div className="dynamic-poster-formulas">{item.branches.map((branch,index)=><div key={`${branch.name}-${index}`}><i>{index+1}</i><strong>{branch.calculation||branch.name}</strong><span>{branch.name}</span><b style={{backgroundColor:colors[branch.next]||'#9b772e'}}>{branch.next}</b></div>)}</div>
    {!!item.history?.length&&<div className="dynamic-validation-list"><h3>逐期连线验证</h3>{item.history.slice().reverse().map((entry,index)=><article className={entry.hit?'hit':'miss'} key={`${entry.sourcePeriod}-${entry.targetPeriod}`}><div className="validation-source"><small>{entry.sourcePeriod}期取号</small><div>{item.branches[0]?.sourcePositions?.map(position=>{const value=draws.find(draw=>draw.period===entry.sourcePeriod)?.numbers[position];return value?<span key={position}><b>{value.number}</b><em>{position===6?'特码':`平${position+1}码`}</em></span>:null})}</div></div><svg className="validation-arrow" viewBox="0 0 150 70" preserveAspectRatio="none" aria-hidden="true"><defs><marker id={`arrow-${index}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill={entry.hit?'#cf3033':'#9a8060'}/></marker></defs><path d="M2 12 C55 12 75 58 145 35" fill="none" stroke={entry.hit?'#cf3033':'#9a8060'} strokeWidth="5" markerEnd={`url(#arrow-${index})`}/></svg><div className="validation-calc">{entry.branches.map(branch=><strong key={branch.name}>{branch.calculation}</strong>)}</div><svg className="validation-arrow second" viewBox="0 0 150 70" preserveAspectRatio="none" aria-hidden="true"><path d="M2 35 C65 4 90 60 145 34" fill="none" stroke={entry.hit?'#cf3033':'#9a8060'} strokeWidth="5" markerEnd={`url(#arrow-${index})`}/></svg><div className="validation-target"><small>{entry.targetPeriod}期特码</small><b>{entry.actualNumber}</b><em>{entry.actualAnimal} · {entry.actualElement}</em><strong>{entry.hit?'命中':'未中'}</strong></div></article>)}</div>}
    <footer><span>公式编号：{item.formulaId||'自动编号'}</span><strong>近30期命中 {item.recent30Hits} 次</strong><em>仅供娱乐参考</em></footer>
  </section>;
}
