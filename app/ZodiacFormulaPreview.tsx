type Branch={name?:string;number?:number;animal?:string};
type Method={name?:string;nextNumber?:number;nextAnimal?:string;branches?:Branch[];sourceKey?:string};

export default function ZodiacFormulaPreview({issue,label,item}:{issue:string;label:string;item:Method}){
  const branches=item.branches?.length?item.branches:[{name:item.name,number:item.nextNumber,animal:item.nextAnimal}];
  return <section className="zodiac-live-card">
    <header><span>{issue}期</span><div><small>公式算法</small><strong>{item.sourceKey??item.name??`${label}公式`}</strong></div></header>
    <div className="zodiac-live-lines">{branches.map((branch,index)=><div key={`${branch.name}-${index}`}><i>{index+1}</i><p>{branch.name}</p><b>{branch.number?String(branch.number).padStart(2,'0'):''}</b><em>{branch.animal??''}</em></div>)}</div>
    <footer><span>下期参考</span><strong>{branches.map(branch=>branch.animal).filter(Boolean).join('、')}</strong></footer>
  </section>;
}
