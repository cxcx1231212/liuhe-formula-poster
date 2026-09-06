'use client';
import {useState} from 'react';

const numbers=Array.from({length:49},(_,index)=>index+1);

export default function NumberPicker(){
 const [count,setCount]=useState(6),[picked,setPicked]=useState<number[]>([]),[copied,setCopied]=useState(false);
 const toggle=(value:number)=>setPicked(current=>current.includes(value)?current.filter(item=>item!==value):current.length<count?[...current,value].sort((a,b)=>a-b):current);
 const random=()=>{const pool=[...numbers];for(let index=pool.length-1;index>0;index--){const swap=Math.floor(Math.random()*(index+1));[pool[index],pool[swap]]=[pool[swap],pool[index]];}setPicked(pool.slice(0,count).sort((a,b)=>a-b));setCopied(false)};
 const copy=async()=>{if(!picked.length)return;await navigator.clipboard.writeText(picked.map(value=>String(value).padStart(2,'0')).join(' '));setCopied(true);setTimeout(()=>setCopied(false),1500)};
 return <section className="number-picker" id="picker" aria-label="挑码助手">
  <header><div><small>NUMBER PICKER</small><h2>挑码助手</h2></div><b>已选 {picked.length}/{count}</b></header>
  <div className="picker-counts">{[3,6,8,10,12,18].map(value=><button type="button" className={count===value?'active':''} onClick={()=>{setCount(value);setPicked(current=>current.slice(0,value));setCopied(false)}} key={value}>{value}码</button>)}</div>
  <div className="picker-numbers">{numbers.map(value=><button type="button" className={picked.includes(value)?'active':''} onClick={()=>{toggle(value);setCopied(false)}} key={value}>{String(value).padStart(2,'0')}</button>)}</div>
  <div className="picker-result"><span>{picked.length?picked.map(value=>String(value).padStart(2,'0')).join(' · '):'点选号码，或使用随机挑选'}</span><div><button type="button" onClick={random}>随机{count}码</button><button type="button" onClick={()=>{setPicked([]);setCopied(false)}}>清空</button><button type="button" disabled={!picked.length} onClick={copy}>{copied?'已复制':'复制'}</button></div></div>
 </section>;
}
