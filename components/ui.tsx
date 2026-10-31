"use client";
import React from "react";
import { ChevronDown } from "lucide-react";

const AV=[{bg:"rgba(139,92,246,0.16)",text:"#C4B5FD"},{bg:"rgba(74,222,128,0.12)",text:"#86EFAC"},{bg:"rgba(251,191,36,0.12)",text:"#FCD34D"},{bg:"rgba(96,165,250,0.12)",text:"#93C5FD"},{bg:"rgba(244,114,182,0.12)",text:"#F9A8D4"}];
export function avColor(s:string){const i=(s.charCodeAt(0)+(s.charCodeAt(1)||0))%AV.length;return AV[i];}
export function Avatar({initials,size=36,src}:{initials:string;size?:number;src?:string|null}){
  const c=avColor(initials);
  if(src) return <img src={src} alt="" width={size} height={size} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",flexShrink:0,border:"1px solid var(--line)"}}/>;
  return(<div style={{width:size,height:size,borderRadius:"50%",background:c.bg,color:c.text,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.36,fontWeight:600,flexShrink:0,letterSpacing:"-0.02em"}}>{initials}</div>);
}

const BADGE:Record<string,{bg:string;color:string}>={default:{bg:"var(--surface-3)",color:"var(--text-2)"},green:{bg:"var(--money-tint)",color:"var(--money)"},amber:{bg:"var(--warn-tint)",color:"var(--warn)"},red:{bg:"var(--danger-tint)",color:"var(--danger)"},purple:{bg:"var(--brand-tint)",color:"var(--brand-400)"}};
export function Badge({children,type="default"}:{children:React.ReactNode;type?:string}){
  const s=BADGE[type]||BADGE.default;
  return(<span style={{display:"inline-flex",alignItems:"center",gap:6,background:s.bg,color:s.color,fontSize:12,lineHeight:"20px",padding:"0 8px",borderRadius:999,fontWeight:500,whiteSpace:"nowrap"}}>{children}</span>);
}

type BtnProps={children:React.ReactNode;onClick?:()=>void;primary?:boolean;ghost?:boolean;danger?:boolean;small?:boolean;large?:boolean;disabled?:boolean;full?:boolean;type?:"button"|"submit";title?:string;style?:React.CSSProperties};
export function Btn({children,onClick,primary,ghost,danger,small,large,disabled,full,type="button",title,style}:BtnProps){
  const cls=["cf-btn",primary&&"cf-btn--primary",ghost&&"cf-btn--ghost",danger&&"cf-btn--danger",small&&"cf-btn--sm",large&&"cf-btn--lg",full&&"cf-btn--full"].filter(Boolean).join(" ");
  return(<button type={type} title={title} className={cls} onClick={onClick} disabled={disabled} style={style}>{children}</button>);
}

export function ProgressBar({value,tone="brand"}:{value:number;tone?:"brand"|"money"}){
  return(<div style={{height:4,background:"var(--surface-3)",borderRadius:2,overflow:"hidden",margin:"8px 0 12px"}}><div style={{height:"100%",width:`${Math.max(0,Math.min(100,value))}%`,background:tone==="money"?"var(--money)":"var(--brand)",borderRadius:2,transition:"width .6s var(--ease)"}}/></div>);
}

/** Label + big mono number. `money` turns the number green (green is reserved for cash). */
export function MetricCard({label,value,sub,money}:{label:string;value:string;sub?:string;money?:boolean}){
  return(<div className="cf-card" style={{padding:"14px 16px"}}>
    <div className="cf-label" style={{marginBottom:6}}>{label}</div>
    <div className="num" style={{fontSize:22,fontWeight:500,color:money?"var(--money)":"var(--text)",lineHeight:1.2}}>{value}</div>
    {sub&&<div style={{fontSize:12,color:"var(--text-3)",marginTop:4}}>{sub}</div>}
  </div>);
}

export function PageHeader({title,sub,action}:{title:string;sub?:React.ReactNode;action?:React.ReactNode}){
  return(<div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:16,flexWrap:"wrap",marginBottom:24}}>
    <div style={{minWidth:0}}><h1 className="cf-h1">{title}</h1>{sub&&<div className="cf-sub" style={{marginTop:4}}>{sub}</div>}</div>
    {action}
  </div>);
}

export function SectionTitle({children,action}:{children:React.ReactNode;action?:React.ReactNode}){
  return(<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",margin:"28px 0 12px"}}><h2 style={{fontSize:15,fontWeight:600}}>{children}</h2>{action}</div>);
}

/** One sentence + one button. Every empty list gets one (PRD 5, rule 3). */
export function EmptyState({title,body,action}:{title:string;body?:string;action?:React.ReactNode}){
  return(<div className="cf-card" style={{padding:"36px 24px",textAlign:"center"}}>
    <div style={{fontSize:15,fontWeight:600}}>{title}</div>
    {body&&<div className="cf-sub" style={{marginTop:6,maxWidth:360,marginInline:"auto"}}>{body}</div>}
    {action&&<div style={{marginTop:16}}>{action}</div>}
  </div>);
}

/** Collapsed "Advanced" drawer for power-user options. */
export function Advanced({children,label="Advanced",defaultOpen=false}:{children:React.ReactNode;label?:string;defaultOpen?:boolean}){
  return(<details className="cf-adv" open={defaultOpen}><summary>{label}<ChevronDown size={16}/></summary><div style={{paddingBottom:12}}>{children}</div></details>);
}

/** Loading placeholder: a flat block that pulses (no gradients, PRD 14.1). */
export function Skeleton({h=16,w="100%",r=6}:{h?:number;w?:number|string;r?:number}){
  return <div style={{height:h,width:w,borderRadius:r,background:"var(--surface-3)",animation:"cf-pulse 1.4s ease-in-out infinite"}}><style>{`@keyframes cf-pulse{0%,100%{opacity:.55}50%{opacity:1}}`}</style></div>;
}

export function fmtViews(n:number):string{if(n>=1000000)return(n/1000000).toFixed(1).replace(/\.0$/,"")+"M";if(n>=1000)return Math.round(n/1000)+"K";return n.toString();}
export function fmtMoney(n:number):string{return"$"+n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});}
export function pct(a:number,b:number):number{return b===0?0:Math.min(100,Math.round((a/b)*100));}
