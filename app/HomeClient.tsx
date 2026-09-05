'use client';
import {Fragment,useState} from 'react';
import type {LatestLottery,LotteryType} from '@/lib/lottery';
import {makeHomeBoardPost} from '@/lib/home-board-post';
import LiveDraw from './LiveDraw';
import BoardBanner from './BoardBanner';
import RecommendedSites from './RecommendedSites';
import RemoteBoard from './RemoteBoard';
const lotteryNames:Record<LotteryType,string>={'1':'香港六合彩','5':'澳门六合彩','8':'疯狂天天六合彩'};
const boards=[
{key:'tema',name:'特码公式',tagline:'号码规律 · 每期整理',categories:[{key:'3',label:'三码中特'},{key:'8',label:'八码中特'},{key:'10',label:'十码中特'},{key:'18',label:'十八码中特'}]},
{key:'zodiac',name:'生肖公式',tagline:'十二生肖 · 思路归档',categories:[{key:'1',label:'一肖中特'},{key:'3',label:'三肖中特'},{key:'6',label:'六肖中特'},{key:'9',label:'九肖中特'}]},
{key:'fushi',name:'复式公式',tagline:'多组组合 · 灵活筛选',categories:[{key:'22',label:'2中2'},{key:'33',label:'3中3'},{key:'2x',label:'二连肖'},{key:'3x',label:'三连肖'}]},
{key:'pingte',name:'平特公式',tagline:'平码推演 · 特肖参考',categories:[{key:'one',label:'平特一肖'},{key:'two',label:'平特二肖'}]},
{key:'danshuang',name:'单双公式',tagline:'单双走势 · 简明分析'},{key:'wave',name:'波色公式',tagline:'红蓝绿波 · 分类查找'},{key:'wuxing',name:'五行公式',tagline:'金木水火土 · 对照推演'},{key:'jiaye',name:'家野公式',tagline:'家野分类 · 一目了然'},
{key:'kill',name:'绝杀公式',tagline:'排除思路 · 逐期记录',categories:[{key:'code',label:'杀码'},{key:'animal',label:'杀肖'},{key:'tail',label:'杀尾'},{key:'head',label:'杀头'},{key:'wave',label:'杀波'}]},
{key:'size',name:'大小公式',tagline:'大小区间 · 快速对照'},{key:'tail',name:'尾数公式',tagline:'十组尾数 · 规律整理'},{key:'head',name:'头数公式',tagline:'号码分段 · 清晰归类'}] as const;
type Manifest={issue:number;methods:Record<string,unknown>[]};
type SearchResult=ReturnType<typeof makeHomeBoardPost>&{boardName:string;categoryName:string};
const searchTargets:{board:string;boardName:string;category:string;categoryName:string;fileKey:string}[]=[];
for(const board of boards){
 const categories:readonly {key:string;label:string}[]='categories' in board?board.categories:[{key:'',label:''}];
 for(const category of categories)searchTargets.push({board:board.key,boardName:board.name,category:category.key,categoryName:category.label,fileKey:board.key==='pingte'?`pingte-${category.key==='two'?'two':'one'}`:`${board.key}-${category.key}`});
}
export default function HomeClient({initialType,latestByType}:{initialType:LotteryType;latestByType:Record<LotteryType,LatestLottery>}){
 const [type,setType]=useState(initialType),[query,setQuery]=useState(''),[results,setResults]=useState<SearchResult[]|null>(null),[searching,setSearching]=useState(false),[searchError,setSearchError]=useState(''),[searchPage,setSearchPage]=useState(1),latest=latestByType[type],version=Number(latest.period)+1;
 const pageSize=30,pages=Math.max(1,Math.ceil((results?.length||0)/pageSize)),shown=results?.slice((searchPage-1)*pageSize,searchPage*pageSize)||[];
 const search=async()=>{
  const needle=query.trim().toLowerCase();
  if(!needle){setResults(null);setSearchError('');return;}
  setSearching(true);setSearchError('');
  try{
   const groups=await Promise.all(searchTargets.map(async target=>{
    const response=await fetch(`/generated/home-board/type-${type}-${target.fileKey}.json?v=${version}`);
    if(!response.ok)return [] as SearchResult[];
    const manifest=await response.json() as Manifest;
    return manifest.methods.map((method,index)=>({...makeHomeBoardPost(type,target.board,target.category,manifest.issue,method,index),boardName:target.boardName,categoryName:target.categoryName}));
   }));
   const words=needle.split(/\s+/),all=groups.flat();
   setResults(all.filter(post=>words.every(word=>`${post.title} ${post.boardName} ${post.categoryName} ${version}期`.toLowerCase().includes(word))));setSearchPage(1);
  }catch{setResults([]);setSearchError('搜索读取失败，请稍后重试');}finally{setSearching(false);}
 };
 const change=(value:LotteryType)=>{if(value===type)return;setType(value);setResults(null);setQuery('');setSearchError('');history.replaceState(null,'',`/?type=${value}`);window.scrollTo({top:0,behavior:'smooth'});};
 return <main>
  <header className="site-header"><a className="brand" href="/">六合公式库</a><nav><form className="formula-search" onSubmit={event=>{event.preventDefault();void search()}}><input name="formula-search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="搜索作者、期数、公式类型" aria-label="搜索公式"/><button type="submit" aria-label="搜索全部公式" disabled={searching}>{searching?'…':'⌕'}</button>{results!==null&&<small>{results.length}条</small>}</form><a href="#boards">公式板块</a></nav></header>
  {results!==null&&<section className="board-sections" style={{marginTop:8,marginBottom:20}}><section className="board-section"><header><span>⌕</span><h2>搜索结果</h2><i>当前彩种全部公式 · 共{results.length}条</i></header>{searchError?<p className="pingte-empty">{searchError}</p>:shown.length?<div className="board-titles">{shown.map((post,index)=><a href={post.href} key={`${post.href}-${index}`}><small>{post.boardName}{post.categoryName?` · ${post.categoryName}`:''}</small><span>{post.title}</span><b>›</b></a>)}</div>:<p className="pingte-empty">没有找到相关公式</p>}{pages>1&&<nav className="board-pagination"><button disabled={searchPage===1} onClick={()=>setSearchPage(page=>Math.max(1,page-1))}>上一页</button><span>{searchPage} / {pages}</span><button disabled={searchPage===pages} onClick={()=>setSearchPage(page=>Math.min(pages,page+1))}>下一页</button></nav>}</section></section>}
  <section className="draw-hero"><div className="lottery-switch"><div>{(['5','1','8'] as LotteryType[]).map(value=><a href={`/?type=${value}`} className={value===type?'active':''} onClick={event=>{event.preventDefault();change(value)}} key={value}>{lotteryNames[value]}</a>)}</div></div><LiveDraw key={type} initial={latest} type={type}/></section>
  <RecommendedSites/>
  <section className="board-sections" id="boards">{boards.map((board,index)=><Fragment key={`${type}-${board.key}`}><section className="board-section" id={`board-${board.name}`}><header><span>{String(index+1).padStart(2,'0')}</span><h2>{board.name}</h2><i>{board.tagline}</i></header><RemoteBoard type={type} board={board.key} version={version} categories={'categories' in board?[...board.categories]:undefined}/></section>{index<boards.length-1&&<BoardBanner index={index}/>}</Fragment>)}</section>
  <footer className="site-footer"><strong>六合公式库</strong><span>FORMULA POSTS · 2026</span></footer>
 </main>;
}
