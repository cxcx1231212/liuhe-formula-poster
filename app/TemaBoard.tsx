'use client';

import {useState} from 'react';
import BoardPostList from './BoardPostList';
import {postAuthor} from '@/lib/post-authors';

type One={recentStreak:number};
type Bundle={recentStreak:number;sourceKey:string};
type Groups=Record<string,{methods:Bundle[]}>;
type Post={href:string;title:string;streak:number;kind:string};
const categories=['三码中特','八码中特','十码中特','十八码中特','特码短期','特码连准','一码中特'] as const;
const slogans=['精准单支公式公开','多支组合逐项计算','历史轨迹清楚整理','本期号码重点参考','手机大字公式分享','全部公式自动筛选'];

export default function TemaBoard({type,issue,oneMethods,groups}:{type:string;issue:number;oneMethods:One[];groups:Groups}){
  const [active,setActive]=useState<(typeof categories)[number]>('三码中特');
  const make=(size:string,label:string,items:(One|Bundle)[]):Post[]=>items.map((item,index)=>({href:`/posts/tema/${size}/${issue}/${String(index+1).padStart(3,'0')}?type=${type}`,title:`${postAuthor(type,`tema${size}` as 'tema1'|'tema3'|'tema8'|'tema10'|'tema18',index)}【${label}】${slogans[index%slogans.length]}`,streak:item.recentStreak,kind:label}));
  const one=make('1','一码中特',oneMethods);
  const maps:Record<string,Post[]>={
    '一码中特':one,'三码中特':make('3','三码中特',groups['3'].methods),'八码中特':make('8','八码中特',groups['8'].methods),
    '十码中特':make('10','十码中特',groups['10'].methods),'十八码中特':make('18','十八码中特',groups['18'].methods),
  };
  const all=Object.values(maps).flat();
  const posts=active==='特码短期'?all.filter(item=>item.streak<3):active==='特码连准'?all.filter(item=>item.streak>=3):maps[active];
  const showKind=active==='特码短期'||active==='特码连准';
  return <>
    <div className="pingte-tabs tema-tabs">{categories.map(category=><button className={active===category?'active':''} onClick={()=>setActive(category)} key={category}>{category}</button>)}</div>
    <div className="pingte-count">当前共 {posts.length} 条公式</div>
    {posts.length?<BoardPostList listKey={active} posts={posts.map(post=>({href:post.href,issue:`${issue}期`,title:post.title,badge:showKind?post.kind.replace('中特','码'):undefined}))}/>:<div className="pingte-empty tema-empty">
      <strong>本期暂无精选一码</strong>
      <span>我们会长期研究并持续追踪，一旦发现值得参考的一码规律，将第一时间发布。更多本期内容可先查看「特码短期」。</span>
      <button onClick={()=>setActive('特码短期')}>查看特码短期</button>
    </div>}
  </>;
}
