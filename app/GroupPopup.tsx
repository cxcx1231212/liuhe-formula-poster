'use client';

import {useEffect,useState} from 'react';

type PopupConfig={imageUrl:string;linkUrl:string|null;displayMode:'always'|'daily';delaySeconds:number};
type PopupResponse={popup?:PopupConfig|null};

function seenKey(imageUrl:string){
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  return `liuhe-group-popup-seen-${date}-${imageUrl}`;
}

function track(eventType:'view'|'click'){
  void fetch('/api/group-popup',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({eventType}),
    keepalive:true,
  }).catch(()=>{});
}

export default function GroupPopup(){
  const [open,setOpen]=useState(false);
  const [popup,setPopup]=useState<PopupConfig|null>(null);
  const close=()=>setOpen(false);
  useEffect(()=>{
    const controller=new AbortController();
    let timer:number|undefined;
    fetch('/api/group-popup',{signal:controller.signal,cache:'no-store'})
      .then(response=>response.ok?response.json() as Promise<PopupResponse>:null)
      .then(result=>{
        const item=result?.popup;
        if(!item||controller.signal.aborted)return;
        try{if(item.displayMode==='daily'&&localStorage.getItem(seenKey(item.imageUrl)))return;}catch{}
        timer=window.setTimeout(()=>{
          if(controller.signal.aborted)return;
          setPopup(item);
          setOpen(true);
          if(item.displayMode==='daily')try{localStorage.setItem(seenKey(item.imageUrl),'1');}catch{}
        },item.delaySeconds*1000);
      })
      .catch(()=>{});
    return ()=>{controller.abort();if(timer!==undefined)window.clearTimeout(timer);};
  },[]);
  useEffect(()=>{
    if(!open)return;
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape')close();};
    window.addEventListener('keydown',onKeyDown);
    return ()=>window.removeEventListener('keydown',onKeyDown);
  },[open]);
  if(!open||!popup)return null;
  return <div className="group-popup-backdrop" onClick={close}>
    <div className="group-popup" role="dialog" aria-modal="true" aria-label="首页弹窗广告" onClick={event=>event.stopPropagation()}>
      <button type="button" className="group-popup-close" onClick={close} aria-label="关闭弹窗">×</button>
      {popup.linkUrl
        ? <a href={popup.linkUrl} target="_blank" rel="noopener noreferrer" aria-label="查看广告详情" onClick={()=>track('click')}><img src={popup.imageUrl} alt="首页弹窗广告" onLoad={()=>track('view')} onError={close}/></a>
        : <img src={popup.imageUrl} alt="首页弹窗广告" onLoad={()=>track('view')} onError={close}/>}
    </div>
  </div>;
}

