'use client';

import {useEffect,useRef} from 'react';

export default function IssueScroller({issues,current,basePath,method,type}:{issues:number[];current:number;basePath:string;method:string;type:string}){
  const currentRef=useRef<HTMLAnchorElement>(null);
  useEffect(()=>{currentRef.current?.scrollIntoView({behavior:'instant',block:'nearest',inline:'center'});},[current]);
  const newest=Math.max(...issues);
  const oldest=Math.min(...issues);
  const pageIssues=[newest];
  for(let issue=newest-6;issue>=oldest;issue-=5)pageIssues.push(issue);
  const currentPage=current>=newest-5?0:Math.max(1,pageIssues.findIndex(issue=>current<=issue&&current>=issue-4));
  return <nav className="issue-scroller" aria-label="期数切换">
    {pageIssues.map((issue,index)=><a ref={index===currentPage?currentRef:null} className={index===currentPage?'current':''} href={`${basePath}/${issue}/${method}?type=${type}`} key={issue}>第{index+1}页</a>)}
  </nav>;
}
