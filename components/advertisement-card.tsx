"use client";
import {useEffect,useRef,useState} from 'react';
import {AD_CONSENT_KEY,parseAdConsent} from '@/lib/advertising';
import {AD_PREFERENCES_EVENT,type DirectLinkCreative} from '@/lib/ads/direct-link';
import type {ManagedCard} from '@/lib/ads/manager';
import './advertisement-card.css';
export function AdvertisementCard({creative,preview=false}:{creative:DirectLinkCreative|ManagedCard;preview?:boolean}){
 const [failed,setFailed]=useState(false),[visible,setVisible]=useState(preview),[imageReady,setImageReady]=useState(false);
 const image=useRef<HTMLImageElement>(null);
 const root=useRef<HTMLElement>(null),sent=useRef({impression:false,click:false});
 const managed='kind' in creative?creative:null,token=managed?.kind==='own'?managed.token:undefined;
 function track(type:'impression'|'click'){
  if(!token||preview||sent.current[type])return;sent.current[type]=true;
  const body=JSON.stringify({token,type});
  try{if(navigator.sendBeacon?.('/api/ads/event',new Blob([body],{type:'application/json'})))return;void fetch('/api/ads/event',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true}).catch(()=>{});}catch{/* Metrics never interrupt reading or navigation. */}
 }
 useEffect(()=>{
  if(preview)return;const sync=()=>{try{setVisible(parseAdConsent(localStorage.getItem(AD_CONSENT_KEY))?.accepted!==false);}catch{setVisible(true);}};sync();
  window.addEventListener('storage',sync);window.addEventListener(AD_PREFERENCES_EVENT,sync);return()=>{window.removeEventListener('storage',sync);window.removeEventListener(AD_PREFERENCES_EVENT,sync);};
 },[preview]);
 useEffect(()=>{setFailed(false);setImageReady(Boolean(image.current?.complete&&image.current.naturalWidth>0));sent.current={impression:false,click:false};},[creative.image_url,token]);
 useEffect(()=>{
  if(!token||!visible||!imageReady||failed||preview||!root.current||!('IntersectionObserver' in window))return;
  let timer:number|undefined,intersects=false;
  const schedule=()=>{window.clearTimeout(timer);if(intersects&&document.visibilityState==='visible'&&!sent.current.impression)timer=window.setTimeout(()=>track('impression'),1000);};
  const observer=new IntersectionObserver(entries=>{intersects=entries[0].intersectionRatio>=0.5;schedule();},{threshold:[0,0.5]});observer.observe(root.current);
  document.addEventListener('visibilitychange',schedule);return()=>{observer.disconnect();window.clearTimeout(timer);document.removeEventListener('visibilitychange',schedule);};
 // The token is fixed for one placement; impression receipts are deduplicated on the server too.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[token,visible,imageReady,failed,preview]);
 if(!visible||failed||!creative.image_url||!creative.title.trim())return null;
 return <aside ref={root} className={`advertisement-card${managed?.kind==='own'?' own-ad':''}`} aria-label="Publicidade" data-ad-card data-ad-kind={managed?.kind||'monetag'}>
  <span className="advertisement-label">PUBLICIDADE</span>
  <a href={preview?undefined:creative.target_url} target={preview?undefined:'_blank'} rel="noopener noreferrer sponsored" referrerPolicy="no-referrer" aria-label={`Publicidade: ${creative.title}${preview?'':' (abre em nova aba)'}`} onClick={e=>{if(e.nativeEvent.isTrusted)track('click');}}>
   {/* eslint-disable-next-line @next/next/no-img-element */}
   <img ref={image} src={creative.image_url} alt="" width={managed?.width||600} height={managed?.height||400} loading="lazy" decoding="async" referrerPolicy="no-referrer" onLoad={()=>setImageReady(true)} onError={()=>setFailed(true)}/>
   {(!managed||managed.show_text)&&<div className="advertisement-copy"><h3>{creative.title}</h3>{creative.description&&<p>{creative.description}</p>}<span>Ver publicidade <span aria-hidden="true">↗</span></span></div>}
  </a>
 </aside>;
}
