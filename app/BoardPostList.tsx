'use client';

import {useEffect,useMemo,useState} from 'react';

export type BoardPost={href:string;issue:string;title:string;badge?:string};

const PAGE_SIZE=10;

export default function BoardPostList({posts,listKey='default'}:{posts:BoardPost[];listKey?:string}){
  const [page,setPage]=useState(1);
  const pages=Math.max(1,Math.ceil(posts.length/PAGE_SIZE));
  useEffect(()=>setPage(1),[listKey]);
  useEffect(()=>{if(page>pages)setPage(pages)},[page,pages]);
  const visible=useMemo(()=>posts.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE),[posts,page]);
  if(!posts.length)return null;
  return <>
    <div className="board-titles">{visible.map(post=><a href={post.href} key={post.href}><span>{post.issue}</span><h3>{post.title}</h3>{post.badge&&<b>{post.badge}</b>}<i>›</i></a>)}</div>
    {pages>1&&<nav className="board-pagination" aria-label="帖子分页">
      <button disabled={page===1} onClick={()=>setPage(value=>Math.max(1,value-1))}>上一页</button>
      {Array.from({length:pages},(_,index)=>index+1).map(value=><button className={page===value?'active':''} aria-current={page===value?'page':undefined} onClick={()=>setPage(value)} key={value}>{value}</button>)}
      <button disabled={page===pages} onClick={()=>setPage(value=>Math.min(pages,value+1))}>下一页</button>
    </nav>}
  </>;
}
