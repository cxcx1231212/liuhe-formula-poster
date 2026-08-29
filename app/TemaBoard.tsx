'use client';

import {useState} from 'react';
import BoardPostList from './BoardPostList';
import {postAuthor} from '@/lib/post-authors';

type Bundle={recentStreak:number;sourceKey:string};
type Groups=Record<string,{methods:Bundle[]}>;
type Post={href:string;title:string};
const categories=['三码中特','八码中特','十码中特','十八码中特'] as const;
const slogans=['精准单支公式公开','多支组合逐项计算','历史轨迹清楚整理','本期号码重点参考','手机大字公式分享','全部公式自动筛选'];

export default function TemaBoard({type,issue,groups}:{type:string;issue:number;groups:Groups}){
  const [active,setActive]=useState<(typeof categories)[number]>('三码中特');
  const make=(size:string,label:string,items:Bundle[]):Post[]=>items.map((_,index)=>({href:`/posts/tema/${size}/${issue}/${String(index+1).padStart(3,'0')}?type=${type}`,title:`${postAuthor(type,`tema${size}` as 'tema3'|'tema8'|'tema10'|'tema18',index)}【${label}】${slogans[index%slogans.length]}`}));
  const maps:Record<string,Post[]>={
    '三码中特':make('3','三码中特',groups['3']?.methods??[]),'八码中特':make('8','八码中特',groups['8']?.methods??[]),
    '十码中特':make('10','十码中特',groups['10']?.methods??[]),'十八码中特':make('18','十八码中特',groups['18']?.methods??[]),
  };
  const posts=maps[active];
  return <>
    <div className="pingte-tabs tema-tabs">{categories.map(category=><button className={active===category?'active':''} onClick={()=>setActive(category)} key={category}>{category}</button>)}</div>
    <div className="pingte-count">当前共 {posts.length} 条公式</div>
    <BoardPostList listKey={active} posts={posts.map(post=>({href:post.href,issue:`${issue}期`,title:post.title}))}/>
  </>;
}
