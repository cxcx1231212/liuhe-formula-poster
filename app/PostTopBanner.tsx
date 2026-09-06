'use client';

import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {usePathname} from 'next/navigation';
import BoardBanner from './BoardBanner';

export default function PostTopBanner(){
  const pathname=usePathname();
  const [target,setTarget]=useState<HTMLElement|null>(null);

  useEffect(()=>{
    if(!pathname.startsWith('/posts/'))return;
    const topbar=document.querySelector('.detail-topbar');
    if(!topbar)return;
    const host=document.createElement('div');
    host.className='post-top-banner';
    host.style.margin='12px 0';
    topbar.insertAdjacentElement('afterend',host);
    setTarget(host);
    return()=>{setTarget(null);host.remove()};
  },[pathname]);

  return target?createPortal(<BoardBanner index={0}/>,target):null;
}
