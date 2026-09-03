'use client';
import {useState} from 'react';
import type {LatestLottery,LotteryType} from '@/lib/lottery';
import LiveDraw from './LiveDraw';
import RemoteBoard from './RemoteBoard';
const lotteryNames:Record<LotteryType,string>={'1':'香港六合彩','5':'澳门六合彩','8':'疯狂天天六合彩'};
const boards=[
{key:'pingte',name:'平特公式',tagline:'平码推演 · 特肖参考',categories:[{key:'one',label:'平特一肖'},{key:'two',label:'平特二肖'}]},
{key:'tema',name:'特码公式',tagline:'号码规律 · 每期整理',categories:[{key:'3',label:'三码中特'},{key:'8',label:'八码中特'},{key:'10',label:'十码中特'},{key:'18',label:'十八码中特'}]},
{key:'zodiac',name:'生肖公式',tagline:'十二生肖 · 思路归档',categories:[{key:'1',label:'一肖中特'},{key:'3',label:'三肖中特'},{key:'6',label:'六肖中特'},{key:'9',label:'九肖中特'}]},
{key:'fushi',name:'复式公式',tagline:'多组组合 · 灵活筛选',categories:[{key:'22',label:'2中2'},{key:'33',label:'3中3'},{key:'2x',label:'二连肖'},{key:'3x',label:'三连肖'}]},
{key:'danshuang',name:'单双公式',tagline:'单双走势 · 简明分析'},{key:'wave',name:'波色公式',tagline:'红蓝绿波 · 分类查找'},{key:'wuxing',name:'五行公式',tagline:'金木水火土 · 对照推演'},{key:'jiaye',name:'家野公式',tagline:'家野分类 · 一目了然'},
{key:'kill',name:'绝杀公式',tagline:'排除思路 · 逐期记录',categories:[{key:'code',label:'杀码'},{key:'animal',label:'杀肖'},{key:'tail',label:'杀尾'},{key:'head',label:'杀头'},{key:'wave',label:'杀波'}]},
{key:'size',name:'大小公式',tagline:'大小区间 · 快速对照'},{key:'tail',name:'尾数公式',tagline:'十组尾数 · 规律整理'},{key:'head',name:'头数公式',tagline:'号码分段 · 清晰归类'}] as const;
export default function HomeClient({initialType,latestByType}:{initialType:LotteryType;latestByType:Record<LotteryType,LatestLottery>}){
 const [type,setType]=useState(initialType),latest=latestByType[type],version=Number(latest.period)+1;
 const change=(value:LotteryType)=>{if(value===type)return;setType(value);history.replaceState(null,'',`/?type=${value}`);window.scrollTo({top:0,behavior:'smooth'});};
 return <main>
  <header className="site-header"><a className="brand" href="/">六合公式库</a><nav><a href="#boards">公式板块</a></nav></header>
  <section className="draw-hero"><div className="lottery-switch"><div>{(['5','1','8'] as LotteryType[]).map(value=><button type="button" className={value===type?'active':''} onClick={()=>change(value)} key={value}>{lotteryNames[value]}</button>)}</div></div><LiveDraw key={type} initial={latest} type={type}/></section>
  <section className="board-sections" id="boards">{boards.map((board,index)=><section className="board-section" key={`${type}-${board.key}`} id={`board-${board.name}`}><header><span>{String(index+1).padStart(2,'0')}</span><h2>{board.name}</h2><i>{board.tagline}</i></header><RemoteBoard type={type} board={board.key} version={version} categories={'categories' in board?[...board.categories]:undefined}/></section>)}</section>
  <footer className="site-footer"><strong>六合公式库</strong><span>FORMULA POSTS · 2026</span></footer>
 </main>;
}
