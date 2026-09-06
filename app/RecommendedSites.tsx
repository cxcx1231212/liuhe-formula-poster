'use client';

import {useEffect,useState} from 'react';

type RecommendedSite={id:number;name:string;domain_url:string;sort_order:number};

export default function RecommendedSites(){
  const [sites,setSites]=useState<RecommendedSite[]>([]);
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    fetch('/api/site-list',{signal:controller.signal})
      .then(response=>response.ok?response.json():Promise.reject(new Error(String(response.status))))
      .then((items:RecommendedSite[])=>setSites(items.filter(item=>item.name&&/^https?:\/\//.test(item.domain_url))))
      .catch(()=>{})
      .finally(()=>setLoaded(true));
    return()=>controller.abort();
  },[]);
  return <section className="site-recommendations" aria-label="站点推荐">
    <header><h2>站点推荐</h2></header>
    <div>{sites.map(site=><a href={site.domain_url} target="_blank" rel="noopener noreferrer" key={site.id}><b>{site.name}</b></a>)}{loaded&&sites.length===0?<p>暂无推荐站点</p>:null}{!loaded?<p>正在读取推荐站点…</p>:null}</div>
  </section>;
}
