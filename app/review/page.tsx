"use client";
import {useEffect,useState} from "react";
import {useSession} from "next-auth/react";
import AppShell from "@/components/AppShell";
import CampaignCard from "@/components/CampaignCard";
import {MetricCard,Badge,Btn,fmtViews,fmtMoney,pct,ProgressBar,Avatar} from "@/components/ui";
import type {Campaign,Clip} from "@/lib/mockData";
export default function ReviewPage(){
  const [clips,setClips]=useState<Clip[]>([]);
  const [campaigns,setCampaigns]=useState<Campaign[]>([]);
  const [views,setViews]=useState<Record<string,string>>({});
  const [processing,setProcessing]=useState<string|null>(null);
  useEffect(()=>{fetch("/api/clips").then(r=>r.json()).then(setClips);fetch("/api/campaigns").then(r=>r.json()).then(setCampaigns);},[]);
  async function handleAction(id:string,action:"approve"|"reject"){
    setProcessing(id);
    const v=parseInt(views[id]||"0");
    await fetch(`/api/clips/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,views:v})});
    const [c,ca]=await Promise.all([fetch("/api/clips").then(r=>r.json()),fetch("/api/campaigns").then(r=>r.json())]);
    setClips(c);setCampaigns(ca);setProcessing(null);
  }
  const pending=clips.filter(c=>c.status==="pending");
  return(<AppShell>
    <div style={{maxWidth:700,margin:"0 auto"}}>
      <div style={{marginBottom:20}}><div style={{fontSize:22,fontWeight:700}}>Review clips</div><div style={{fontSize:13,color:"var(--text2)",marginTop:3}}>{pending.length} pending</div></div>
      {pending.length===0&&<div style={{padding:32,textAlign:"center",fontSize:14,color:"var(--text2)",background:"var(--bg1)",borderRadius:14,border:"1px solid var(--border)"}}>All caught up!</div>}
      {pending.map(clip=>{const camp=campaigns.find(c=>c.id===clip.campaignId);return(<div key={clip.id} style={{background:"var(--bg1)",borderRadius:14,border:"1px solid var(--border)",padding:16,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:10}}>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:500,marginBottom:3}}>{clip.title}</div><div style={{fontSize:12,color:"var(--text2)"}}>by {clip.submittedBy} · {camp?.streamer} · {clip.platform} · {clip.date}</div></div>
          <Badge type="amber">Pending</Badge>
        </div>
        <a href={clip.url} target="_blank" rel="noreferrer" style={{fontSize:12,color:"var(--purple-text)",wordBreak:"break-all",display:"block",marginBottom:14}}>{clip.url}</a>
        <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
          <div style={{flex:1}}><div style={{fontSize:11,color:"var(--text1)",marginBottom:5}}>Verified view count</div><input type="number" placeholder="e.g. 50000" value={views[clip.id]||""} onChange={e=>setViews(p=>({...p,[clip.id]:e.target.value}))}/></div>
          <Btn primary small disabled={processing===clip.id} onClick={()=>handleAction(clip.id,"approve")}>{processing===clip.id?"...":"Approve"}</Btn>
          <Btn small disabled={processing===clip.id} onClick={()=>handleAction(clip.id,"reject")}>Reject</Btn>
        </div>
        {views[clip.id]&&<div style={{fontSize:12,color:"var(--text2)",marginTop:8}}>Payout: {fmtMoney((parseInt(views[clip.id])/1000)*0.5)}</div>}
      </div>);})}
    </div>
  </AppShell>);
}
