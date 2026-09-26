'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {BoardPost} from './BoardPostList';
type Category={key:string;label:string};type Data={total:number;page:number;pages:number;posts:BoardPost[]};
const cache=new Map<string,Data>();
const pending=new Map<string,Promise<Data>>();
function load(url:string){
 const existing=cache.get(url);if(existing)return Promise.resolve(existing);
 if(pending.has(url))return pending.get(url)!;
 const task=fetch(url).then(async response=>{if(!response.ok)throw Error('读取失败');const value=await response.json() as Data;if(!Number.isInteger(value.page)||!Array.isArray(value.posts)||value.posts.length>10)throw Error('分页格式错误');cache.set(url,value);while(cache.size>48)cache.delete(cache.keys().next().value!);return value;}).finally(()=>pending.delete(url));
 pending.set(url,task);return task;
}
export default function RemoteBoard({type,board,version,categories=[{key:'',label:''}]}:{type:string;board:string;version:number;categories?:Category[]}){
 const [category,setCategory]=useState(categories[0].key),[page,setPage]=useState(1),[visible,setVisible]=useState(false),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 const url=`/api/home-board?type=${type}&board=${board}&category=${category}&page=${page}&v=${version}`;
 const [loaded,setLoaded]=useState<{url:string;value:Data}|null>(null);
 const data=loaded?.url===url?loaded.value:null,root=useRef<HTMLDivElement>(null);
 useEffect(()=>{const el=root.current;if(!el)return;if(typeof IntersectionObserver==='undefined'){setVisible(true);return;}const observer=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){setVisible(true);observer.disconnect();}},{rootMargin:'500px'});observer.observe(el);return()=>observer.disconnect()},[]);
 useEffect(()=>{if(!visible)return;let cancelled=false;setError(false);load(url).then(value=>{if(!cancelled)setLoaded({url,value})}).catch(()=>{if(!cancelled)setError(true)});return()=>{cancelled=true}},[visible,url,retry]);
 const pageNumbers=useMemo(()=>{const pages=data?.pages??1;if(pages<=5)return Array.from({length:pages},(_,i)=>i+1);const start=Math.min(Math.max(1,page-2),pages-4);return Array.from({length:5},(_,i)=>start+i)},[data?.pages,page]);
 const change=(key:string)=>{setCategory(key);setPage(1);setError(false)};
 return <div ref={root} className="remote-board">
 {categories.length>1&&<div className={`pingte-tabs ${board==='pingte'?'pingte-main-tabs':''} ${board==='tema'?'tema-tabs':''}`}>{categories.map(c=><button className={category===c.key?'active':''} onClick={()=>change(c.key)} key={c.key}>{c.label}</button>)}</div>}
 <div className="pingte-count">{data?`当前共 ${data.total} 条公式`:'正在读取公式…'}</div>
 {error?<div className="pingte-empty"><strong>读取失败</strong><button onClick={()=>setRetry(v=>v+1)}>重新加载</button></div>:data?<><div className="board-titles">{data.posts.map(post=><a href={post.href} target="_blank" rel="noopener noreferrer" key={post.href}><span>{post.issue}</span><h3>{post.title}</h3><i>›</i></a>)}</div>{data.pages>1&&<nav className="board-pagination" aria-label="帖子分页"><button disabled={page===1} onClick={()=>setPage(v=>v-1)}>上一页</button>{pageNumbers.map(v=><button className={page===v?'active':''} onClick={()=>setPage(v)} key={v}>{v}</button>)}<button disabled={page===data.pages} onClick={()=>setPage(v=>v+1)}>下一页</button></nav>}</>:<div className="board-list-loading" aria-hidden="true"/>}
 </div>;
}
