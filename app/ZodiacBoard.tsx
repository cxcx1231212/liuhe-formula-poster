'use client';

import {useState} from 'react';
import BoardPostList from './BoardPostList';
import {postAuthor} from '@/lib/post-authors';

type Method={recentStreak:number;recent30Rate:number};
type Groups=Record<string,{methods:Method[]}>;
const categories=['一肖','三肖','六肖','九肖'] as const;
const sizes:Record<(typeof categories)[number],string>={'一肖':'1','三肖':'3','六肖':'6','九肖':'9'};
const slogans=['特肖轨迹长期追踪','高准确率公式公开','历史表现自动排名','本期精选生肖参考','逐期回测清楚展示','手机大字图免费分享'];

export default function ZodiacBoard({type,issue,groups}:{type:string;issue:number;groups:Groups}){
  const [active,setActive]=useState<(typeof categories)[number]>('一肖');
  const size=sizes[active];
  const posts=(groups[size]?.methods??[]).map((method,index)=>({
    href:`/posts/zodiac/${size}/${issue}/${String(index+1).padStart(3,'0')}?type=${type}`,
    title:`${postAuthor(type,`zodiac${size}` as 'zodiac1'|'zodiac3'|'zodiac6'|'zodiac9',index)}【${active}中特】${slogans[index%slogans.length]}`,
    rate:method.recent30Rate,
  }));
  return <>
    <div className="pingte-tabs">{categories.map(category=><button className={active===category?'active':''} onClick={()=>setActive(category)} key={category}>{category}</button>)}</div>
    <div className="pingte-count">全公式库 · 当前共 {posts.length} 条公式</div>
    {posts.length?<BoardPostList listKey={active} posts={posts.map(post=>({href:post.href,issue:`${issue}期`,title:post.title}))}/>:<div className="pingte-empty"><strong>本期生肖公式正在生成</strong><span>全部公式生成完成后会自动显示在这里。</span></div>}
  </>;
}
