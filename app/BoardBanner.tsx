'use client';

import {useEffect,useState} from 'react';

type BannerAd={id:number;position_key:string;image_url:string;link_url:string};
let sharedRequest:Promise<BannerAd[]>|null=null;
function loadAds(){
  if(!sharedRequest) sharedRequest=fetch('/api/banner-ads').then(async response=>response.ok?await response.json() as BannerAd[]:[]).catch(()=>[] as BannerAd[]);
  return sharedRequest;
}
export default function BoardBanner({index}:{index:number}){
  const [ads,setAds]=useState<BannerAd[]>([]);
  useEffect(()=>{let active=true;loadAds().then(items=>{if(active)setAds(items)});return()=>{active=false}},[]);
  if(!ads.length)return null;
  const ad=ads[index%ads.length]!;
  return <a className="board-banner" href={ad.link_url||'#'} target="_blank" rel="noopener noreferrer" aria-label={`横幅广告位 ${index+1}`}><img src={ad.image_url} alt="" loading="lazy"/></a>;
}
