import {formulaManifests,requestedLotteryType} from '@/lib/formula-manifests';

type Method={rank:string;image:string;numbers?:number[];animals?:string[]};
type Group={label:string;kind:string;methods:Method[]};

export default async function FushiPost({params,searchParams}:{params:Promise<{category:string;issue:string;method:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const {category,issue,method}=await params;
  const type=requestedLotteryType(await searchParams);const manifest=formulaManifests.fushi[type];
  const group=(manifest.groups as Record<string,Group>)[category];
  const index=group?.methods.findIndex(item=>item.rank===method)??-1;
  const item=index>=0?group.methods[index]:undefined;
  if(issue!==String(manifest.issue)||!group||!item){
    return <main className="not-found"><h1>帖子不存在</h1><a href="/">返回首页</a></main>;
  }
  const values=group.kind==='animal'?item.animals:item.numbers?.map(number=>String(number).padStart(2,'0'));
  const previous=index>0?group.methods[index-1].rank:null;
  const next=index<group.methods.length-1?group.methods[index+1].rank:null;
  return <main className="post-page">
    <header className="site-header"><a className="brand" href="/">六合公式库</a><nav><a href="/">首页</a><a href="/#board-复式公式">复式公式</a></nav></header>
    <article className="detail pingte-detail">
      <div className="detail-topbar"><a className="detail-back" href="/#board-复式公式"><i>←</i><span><small>BACK TO INDEX</small><strong>返回复式板块</strong></span></a></div>
      <header className="detail-title"><span>{group.label}</span><h1>2026-{issue}期｜{group.label}</h1></header>
      <section className="method-card single-method">
        <header className="simple-method-title"><strong>{group.kind==='animal'?'参考生肖':'参考号码'}：{values?.join('、')}</strong></header>
        <figure className="formula-frame"><img src={item.image} alt={`${group.label}公式图`} draggable="false" /></figure>
      </section>
      <p className="formula-note">依据前期开奖数据推算下期复式组合，图中展示计算来源与历史命中轨迹。只计算六个平码，重复号码或生肖只计一次。仅供娱乐参考。</p>
      <nav className="post-pager">
        {previous?<a href={`/posts/fushi/${category}/${issue}/${previous}?type=${type}`}><small>上一个公式</small><strong>{group.label} 第{index}条</strong></a>:<span/>}
        {next?<a href={`/posts/fushi/${category}/${issue}/${next}?type=${type}`}><small>下一个公式</small><strong>{group.label} 第{index+2}条</strong></a>:<span/>}
      </nav>
    </article>
    <footer className="site-footer"><strong>六合公式库</strong><span>FORMULA POSTS · 2026</span></footer>
  </main>;
}
