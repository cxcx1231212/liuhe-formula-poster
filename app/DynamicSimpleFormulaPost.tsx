import DynamicWuxingPoster from './DynamicWuxingPoster';
import {LOTTERY_SHORT_NAMES,type LotteryType} from '@/lib/lottery';
import type {ReactNode} from 'react';

type RawMethod={rank:string;label?:string;sourceKey?:string;name?:string;next?:string;recentStreak?:number;recent30Hits?:number;formulaId?:string};

export default function DynamicSimpleFormulaPost({type,issue,navigationIssue,method,item,draws,board,hash,basePath,index,total,note,posterItemOverride,periodNav}:{type:LotteryType;issue:string;navigationIssue?:string;method:string;item:RawMethod;draws:any[];board:string;hash:string;basePath:string;index:number;total:number;note:string;posterItemOverride?:any;periodNav?:ReactNode}){
  const source=item.sourceKey||item.name||`${board}计算`;
  const posterItem=posterItemOverride||{label:item.label||board,sourceKey:source,next:[item.next||''],recentStreak:item.recentStreak||0,recent30Hits:item.recent30Hits||0,formulaId:item.formulaId,branches:[{name:item.name||source,next:item.next||'',calculation:item.name||source}]};
  const home=`/?type=${type}`;const back=`${home}#board-${hash}`;
  const linkIssue=navigationIssue||issue;
  const link=(target:number)=>`${basePath}/${linkIssue}/${String(target+1).padStart(3,'0')}?type=${type}`;
  return <main className="post-page"><header className="site-header"><a className="brand" href={home}>六合公式库</a><nav><a href={home}>首页</a><a href={back}>{board}公式</a></nav></header><article className="detail pingte-detail"><div className="detail-topbar"><a className="detail-back" href={back}><i>←</i><span><small>BACK TO INDEX</small><strong>返回{board}板块</strong></span></a>{periodNav}</div><section className="method-card single-method"><DynamicWuxingPoster issue={issue} item={posterItem} draws={draws.slice(-6)} mode={board==='绝杀'?'kill':board==='大小'?'size':'generic'} lotteryName={LOTTERY_SHORT_NAMES[type]}/></section><p className="formula-note">{note}</p><nav className="post-pager">{index>0?<a href={link(index-1)}><small>上一个公式</small><strong>{board} 第{index}条</strong></a>:<span/>}{index<total-1?<a href={link(index+1)}><small>下一个公式</small><strong>{board} 第{index+2}条</strong></a>:<span/>}</nav></article><footer className="site-footer"><strong>六合公式库</strong><span>FORMULA POSTS · 2026</span></footer></main>;
}
