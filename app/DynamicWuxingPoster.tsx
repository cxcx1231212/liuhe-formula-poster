type Branch={name:string;next:string};
type Method={label:string;sourceKey:string;next:string[];recentStreak:number;recent30Hits:number;branches:Branch[];formulaId?:string};

const colors:Record<string,string>={金:'#b78934',木:'#24814a',水:'#247cae',火:'#c73538',土:'#85542f'};

export default function DynamicWuxingPoster({issue,item}:{issue:string;item:Method}){
  return <section className="dynamic-poster" aria-label={`${issue}期${item.label}动态公式图`}>
    <div className="dynamic-poster-watermark" aria-hidden="true">六合公式库　六合公式库　六合公式库<br/>六合公式库　六合公式库　六合公式库<br/>六合公式库　六合公式库　六合公式库</div>
    <header><small>六合公式库 · 动态公式图</small><h2>2026-{issue}期 · {item.label}</h2><p>{item.sourceKey}</p></header>
    <div className="dynamic-poster-prediction"><span>下期参考</span><div>{item.next.map(value=><b key={value} style={{backgroundColor:colors[value]||'#9b772e'}}>特{value}</b>)}</div></div>
    <div className="dynamic-poster-formulas">{item.branches.map((branch,index)=><div key={`${branch.name}-${index}`}><i>{index+1}</i><strong>{branch.name}</strong><span>计算结果</span><b style={{backgroundColor:colors[branch.next]||'#9b772e'}}>{branch.next}</b></div>)}</div>
    <footer><span>公式编号：{item.formulaId||'自动编号'}</span><strong>近30期命中 {item.recent30Hits} 次</strong><em>仅供娱乐参考</em></footer>
  </section>;
}
