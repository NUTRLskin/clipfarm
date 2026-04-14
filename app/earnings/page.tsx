"use client";
import {useEffect,useState} from "react";
import {useSession} from "next-auth/react";
import AppShell from "@/components/AppShell";
import CampaignCard from "@/components/CampaignCard";
import {MetricCard,Badge,Btn,fmtViews,fmtMoney,pct,ProgressBar,Avatar} from "@/components/ui";
import type {Campaign,Clip} from "@/lib/mockData";
export default function EarningsPage(){
  const [clips,setClips]=useState<Clip[]>([]);
  useEffect(()=>{fetch("/api/clips").then(r=>r.json()).then(setClips);},[]);
  const paid=clips.filter(c=>c.status==="paid");
  const totalEarned=paid.reduce((a,c)=>a+c.earned,0);
  return(<AppShell>
    <div style={{maxWidth:700,margin:"0 auto"}}>
      <div style={{marginBottom:20}}><div style={{fontSize:22,fontWeight:700}}>Earnings</div><div style={{fontSize:13,color:"var(--text2)",marginTop:3}}>$0.50 per 1,000 views</div></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24}}>
        <MetricCard label="Total earned" value={fmtMoney(totalEarned)} sub="all time"/>
        <MetricCard label="Pending" value={fmtMoney(clips.filter(c=>c.status==="pending").reduce((a,c)=>a+c.earned,0))} sub="awaiting approval"/>
        <MetricCard label="Clips paid" value={String(paid.length)} sub="approved"/>
        <MetricCard label="Total views" value={fmtViews(paid.reduce((a,c)=>a+c.views,0))} sub="on paid clips"/>
      </div>
      <div style={{fontSize:14,fontWeight:600,marginBottom:12}}>Paid clips</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {paid.map(clip=>(<div key={clip.id} style={{background:"var(--bg1)",borderRadius:12,border:"1px solid var(--border)",padding:"13px 14px",display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{clip.title}</div><div style={{fontSize:11,color:"var(--text2)",marginTop:2}}>{fmtViews(clip.views)} views · {clip.date}</div></div>
          <div style={{fontSize:16,fontWeight:700,color:"var(--green-text)",flexShrink:0}}>{fmtMoney(clip.earned)}</div>
        </div>))}
        {paid.length===0&&<div style={{padding:28,textAlign:"center",fontSize:14,color:"var(--text2)",background:"var(--bg1)",borderRadius:14,border:"1px solid var(--border)"}}>No paid clips yet</div>}
      </div>
    </div>
  </AppShell>);
}
