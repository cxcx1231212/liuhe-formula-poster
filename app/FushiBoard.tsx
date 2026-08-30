'use client';

import {useState} from 'react';
import BoardPostList from './BoardPostList';
import {postAuthor} from '@/lib/post-authors';

type Method={rank:string;recentStreak:number;recent30Rate:number};
type Group={label:string;methods:Method[]};
type Groups=Record<string,Group>;
const categories=[['22','二中二'],['33','三中三'],['2x','二连肖'],['3x','三连肖']] as const;
const slogans=['高准确率复式公开','历史表现自动排名','逐期回测清楚展示','本期精选组合参考','手机大字图免费分享','长期追踪及时更新'];

export default function FushiBoard({type,issue,groups}:{type:string;issue:number;groups:Groups}){
  const [active,setActive]=useState('22');
  const group=groups[active];
  const posts=(group?.methods??[]).map((method,index)=>({
    href:`/posts/fushi/${active}/${issue}/${method.rank}?type=${type}`,
    title:`${postAuthor(type,`fushi${active}` as 'fushi22'|'fushi33'|'fushi2x'|'fushi3x',index)}【${group.label}】${slogans[index%slogans.length]}`,
  }));
  return <>
    <div className="pingte-tabs">{categories.map(([key,label])=><button className={active===key?'active':''} onClick={()=>setActive(key)} key={key}>{label}</button>)}</div>
    <div className="pingte-count">全公式库 · 当前共 {posts.length} 条公式</div>
    {posts.length?<BoardPostList listKey={active} posts={posts.map(post=>({href:post.href,issue:`${issue}期`,title:post.title}))}/>:<div className="pingte-empty"><strong>本期暂无精选复式公式</strong><span>我们会长期研究并持续追踪，达到上榜标准后第一时间发布。</span></div>}
  </>;
}
