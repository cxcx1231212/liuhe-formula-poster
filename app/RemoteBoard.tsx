'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {BoardPost} from './BoardPostList';
type Category={key:string;label:string};type Data={total:number;page:number;pages:number;posts:BoardPost[]};
export default function RemoteBoard({type,board,categories=[{key:'',label:''}]}:{type:string;board:string;categories?:Category[]}){
  const [category,setCategory]=useState(categories[0].key),[page,setPage]=useState(1),[data,setData]=useState<Data|null>(null),[visible,setVisible]=useState(false),[error,setError]=useState(false);const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{const el=root.current;if(!el)return;const observer=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){setVisible(true);observer.disconnect();}},{rootMargin:'500px'});observer.observe(el);return()=>observer.disconnect()},[]);
  useEffect(()=>{if(!visible)return;const controller=new AbortController();fetch(`/api/home-board?type=${type}&board=${board}&category=${encodeURIComponent(category)}&page=${page}`,{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error();return await r.json() as Data}).then(value=>{setData(value);setError(false)}).catch(e=>{if(e.name!=='AbortError')setError(true)});return()=>controller.abort()},[visible,type,board,category,page]);
  const pageNumbers=useMemo(()=>{const pages=data?.pages??1;if(pages<=5)return Array.from({length:pages},(_,i)=>i+1);const start=Math.min(Math.max(1,page-2),pages-4);return Array.from({length:5},(_,i)=>start+i)},[data?.pages,page]);
  const change=(key:string)=>{setCategory(key);setPage(1);setData(null);setError(false)};
  return <div ref={root} className="remote-board">
    {categories.length>1&&<div className={`pingte-tabs ${board==='pingte'?'pingte-main-tabs':''} ${board==='tema'?'tema-tabs':''}`}>{categories.map(c=><button className={category===c.key?'active':''} onClick={()=>change(c.key)} key={c.key}>{c.label}</button>)}</div>}
    <div className="pingte-count">{data?`当前共 ${data.total} 条公式`:'正在读取公式…'}</div>
    {error?<div className="pingte-empty"><strong>读取失败</strong><button onClick={()=>{setVisible(false);requestAnimationFrame(()=>setVisible(true))}}>重新加载</button></div>:data?<><div className="board-titles">{data.posts.map(post=><a href={post.href} key={post.href}><span>{post.issue}</span><h3>{post.title}</h3><i>›</i></a>)}</div>{data.pages>1&&<nav className="board-pagination" aria-label="帖子分页"><button disabled={page===1} onClick={()=>setPage(v=>v-1)}>上一页</button>{pageNumbers.map(v=><button className={page===v?'active':''} onClick={()=>setPage(v)} key={v}>{v}</button>)}<button disabled={page===data.pages} onClick={()=>setPage(v=>v+1)}>下一页</button></nav>}</>:<div className="board-list-loading" aria-hidden="true"/>}
  </div>;
}
