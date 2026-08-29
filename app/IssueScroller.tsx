'use client';

import {useEffect,useRef} from 'react';

export default function IssueScroller({issues,current,basePath,method,type}:{issues:number[];current:number;basePath:string;method:string;type:string}){
  const currentRef=useRef<HTMLAnchorElement>(null);
  useEffect(()=>{currentRef.current?.scrollIntoView({behavior:'instant',block:'nearest',inline:'center'});},[current]);
  return <nav className="issue-scroller" aria-label="期数切换">
    {issues.map(issue=><a ref={issue===current?currentRef:null} className={issue===current?'current':''} href={`${basePath}/${issue}/${method}?type=${type}`} key={issue}>{issue}期</a>)}
  </nav>;
}
