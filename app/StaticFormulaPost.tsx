import type {ReactNode} from 'react';

type Pager={href:string;eyebrow:string;label:string}|null;

export default function StaticFormulaPost({type,board,hash,image,alt,note,previous=null,next=null,extra=null}:{type:string;board:string;hash:string;image:string;alt:string;note:string;previous?:Pager;next?:Pager;extra?:ReactNode}){
  const home=`/?type=${type}`;
  const back=`${home}#board-${hash}`;
  return <main className="post-page">
    <header className="site-header"><a className="brand" href={home}>六合公式库</a><nav><a href={home}>首页</a><a href={back}>{board}公式</a></nav></header>
    <article className="detail pingte-detail static-formula-detail">
      <div className="detail-topbar"><a className="detail-back" href={back}><i>←</i><span><small>BACK TO INDEX</small><strong>返回{board}板块</strong></span></a></div>
      <section className="method-card single-method"><figure className="formula-frame"><img src={image} alt={alt} draggable="false"/></figure></section>
      <p className="formula-note">{note}</p>
      {extra}
      {(previous||next)&&<nav className="post-pager">{previous?<a href={previous.href}><small>{previous.eyebrow}</small><strong>{previous.label}</strong></a>:<span/>}{next?<a href={next.href}><small>{next.eyebrow}</small><strong>{next.label}</strong></a>:<span/>}</nav>}
    </article>
    <footer className="site-footer"><strong>六合公式库</strong><span>FORMULA POSTS · 2026</span></footer>
  </main>;
}
