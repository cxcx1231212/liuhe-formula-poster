'use client';

import {useState} from 'react';
import BoardPostList from './BoardPostList';
import {postAuthor} from '@/lib/post-authors';

type Method={recentStreak:number};
type Post={issue:string;title:string;href:string};
const oneTitles=['历史轨迹完整公开','平码尾数实战参考','连续命中规律分享','下期特肖重点参考','平码推演清晰易懂','合数公式逐期验证','精选公式稳定追踪','独家思路免费公开','七码总分规律解析','本期规律参考分享'];
const twoTitles=['双肖同时开轨迹公开','两条公式同步验证','平码特码全部计入','双支公式清楚易懂','历史同期开出参考','两肖组合重点分享','逐期双线轨迹整理','精选双肖免费公开','双肖规律手机大字图','本期两肖参考分享'];
const categories=['平特一肖','平特二肖'] as const;

export default function PingteBoard({type,issue,oneMethods,twoMethods}:{type:string;issue:number;oneMethods:Method[];twoMethods:Method[]}){
  const [active,setActive]=useState<(typeof categories)[number]>('平特一肖');
  const one:Post[]=oneMethods.map((_item,index)=>({issue:`${issue}期`,title:`${postAuthor(type,'pingte',index)}【平特一肖】${oneTitles[index%oneTitles.length]}`,href:`/posts/pingte/${issue}/${String(index+1).padStart(3,'0')}?type=${type}`}));
  const two:Post[]=twoMethods.map((_item,index)=>({issue:`${issue}期`,title:`${postAuthor(type,'pingte2',index)}【平特二肖】${twoTitles[index%twoTitles.length]}`,href:`/posts/pingte2/${issue}/${String(index+1).padStart(3,'0')}?type=${type}`}));
  const posts=active==='平特一肖'?one:two;
  return <>
    <div className="pingte-tabs pingte-main-tabs">{categories.map(category=><button className={active===category?'active':''} onClick={()=>setActive(category)} key={category}>{category}</button>)}</div>
    <div className="pingte-count">当前共 {posts.length} 条公式</div>
    {posts.length?<BoardPostList listKey={active} posts={posts}/>:<div className="pingte-empty"><strong>暂无符合条件的公式</strong></div>}
  </>;
}
