import {formulaManifests,requestedLotteryType} from '@/lib/formula-manifests';
import ArchivedFormulaPost from '@/app/ArchivedFormulaPost';

type ZodiacMethod={name?:string;sourceKey?:string;animals?:string[];nextAnimal?:string;recent30Rate:number};
const labels:Record<string,string>={'1':'一肖','3':'三肖','6':'六肖','9':'九肖'};

export default async function ZodiacPost({params,searchParams}:{params:Promise<{size:string;issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {size,issue,method}=await params;
  const type=requestedLotteryType(await searchParams);const manifest=formulaManifests.zodiac[type];
  const index=Number(method)-1;
  const group=(manifest.groups as Record<string,{methods:ZodiacMethod[]}>)[size];
  const item=group?.methods[index];
  const label=labels[size];
  if(issue!==String(manifest.issue)||!label||!item||!Number.isInteger(index)||index<0){
    return <ArchivedFormulaPost type={type} path={`/posts/zodiac/${size}/${issue}/${method}`} backHref={`/?type=${type}#board-生肖公式`} backLabel="返回生肖板块"/>;
  }
  const animals=item.animals??(item.nextAnimal?[item.nextAnimal]:[]);
  const image=`/generated/zodiac/type-${type}-${String(issue).padStart(3,'0')}-${size.padStart(2,'0')}-${method}.webp`;
  const previous=index>0?String(index).padStart(3,'0'):null;
  const next=index<group.methods.length-1?String(index+2).padStart(3,'0'):null;
  return <main className="post-page">
    <header className="site-header"><a className="brand" href="/">六合公式库</a><nav><a href="/">首页</a><a href="/#board-生肖公式">生肖公式</a></nav></header>
    <article className="detail pingte-detail">
      <div className="detail-topbar"><a className="detail-back" href="/#board-生肖公式"><i>←</i><span><small>BACK TO INDEX</small><strong>返回生肖板块</strong></span></a></div>
      <header className="detail-title"><span>{label}中特</span><h1>2026-{issue}期｜{label}中特</h1></header>
      <section className="method-card single-method">
        <header className="simple-method-title"><strong>参考生肖：{animals.join('、')}</strong></header>
        <figure className="formula-frame"><img src={image} alt={`${label}中特公式图`} draggable="false" /></figure>
      </section>
      <p className="formula-note">依据前期开奖数据推算下期特码生肖，图中展示计算过程与历史轨迹。仅供娱乐参考。</p>
      <nav className="post-pager">
        {previous?<a href={`/posts/zodiac/${size}/${issue}/${previous}?type=${type}`}><small>上一个公式</small><strong>{label} 第{index}条</strong></a>:<span/>}
        {next?<a href={`/posts/zodiac/${size}/${issue}/${next}?type=${type}`}><small>下一个公式</small><strong>{label} 第{index+2}条</strong></a>:<span/>}
      </nav>
    </article>
    <footer className="site-footer"><strong>六合公式库</strong><span>FORMULA POSTS · 2026</span></footer>
  </main>;
}
