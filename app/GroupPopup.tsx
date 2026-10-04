'use client';

import {useEffect,useState} from 'react';

const SEEN_KEY='liuhe-group-popup-seen';
const PROMOTION_URL='https://89.208.245.215:1340/';

export default function GroupPopup(){
  const [open,setOpen]=useState(false);
  const close=()=>{
    setOpen(false);
    try{sessionStorage.setItem(SEEN_KEY,'1');}catch{}
  };
  useEffect(()=>{
    try{if(sessionStorage.getItem(SEEN_KEY))return;}catch{}
    const timer=window.setTimeout(()=>setOpen(true),0);
    return ()=>window.clearTimeout(timer);
  },[]);
  useEffect(()=>{
    if(!open)return;
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape'){
      setOpen(false);
      try{sessionStorage.setItem(SEEN_KEY,'1');}catch{}
    }};
    window.addEventListener('keydown',onKeyDown);
    return ()=>window.removeEventListener('keydown',onKeyDown);
  },[open]);
  if(!open)return null;
  return <div className="group-popup-backdrop" onClick={close}>
    <div className="group-popup" role="dialog" aria-modal="true" aria-label="第277期精选资料" onClick={event=>event.stopPropagation()}>
      <button type="button" className="group-popup-close" onClick={close} aria-label="关闭弹窗">×</button>
      <a href={PROMOTION_URL} target="_blank" rel="noopener noreferrer" aria-label="查看第277期精选资料">
        <img src="/group-popup-277.gif" alt="第277期精选资料，点击查看"/>
      </a>
    </div>
  </div>;
}
