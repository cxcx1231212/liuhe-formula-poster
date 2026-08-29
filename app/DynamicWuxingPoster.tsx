import './DynamicWuxingPoster.css';

type Branch={name:string;next:string;calculation?:string};
type Method={label:string;sourceKey:string;next:string[];recentStreak:number;recent30Hits:number;branches:Branch[];formulaId?:string};
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
    <footer><span>公式编号：{item.formulaId||'自动编号'}</span><strong>近30期命中 {item.recent30Hits} 次</strong><em>仅供娱乐参考</em></footer>
  </section>;
}
