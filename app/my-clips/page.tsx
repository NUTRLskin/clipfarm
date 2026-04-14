"use client";
import {useEffect,useState} from "react";
import {useSession} from "next-auth/react";
import AppShell from "@/components/AppShell";
import CampaignCard from "@/components/CampaignCard";
import {MetricCard,Badge,Btn,fmtViews,fmtMoney,pct,ProgressBar,Avatar} from "@/components/ui";
import type {Campaign,Clip} from "@/lib/mockData";
export default function MyClipsPage(){
  const [clips,setClips]=useState<Clip[]>([]);
  const [campaigns,setCampaigns]=useState<Campaign[]>([]);
  const [filter,setFilter]=useState<"all"|"paid"|"pending"|"rejected">("all");
  useEffect(()=>{fetch("/api/clips").then(r=>r.json()).then(setClips);fetch("/api/campaigns").then(r=>r.json()).then(setCampaigns);},[]);
  const filtered=filter==="all"?clips:clips.filter(c=>c.status===filter);
  return(<AppShell>
    <div style={{maxWidth:700,margin:"0 auto"}}>
      <div style={{marginBottom:20}}><div style={{fontSize:22,fontWeight:700}}>My clips</div><div style={{fontSize:13,color:"var(--text2)",marginTop:3}}>{clips.length} total</div></div>
      <div style={{display:"flex",gap:8,marginBottom:20,overflowX:"auto",paddingBottom:2}}>
        {(["all","paid","pending","rejected"] as const).map(f=>(<button key={f} onClick={()=>setFilter(f)} style={{padding:"7px 16px",borderRadius:20,border:"none",fontSize:13,background:filter===f?"var(--purple)":"var(--bg3)",color:filter===f?"#fff":"var(--text1)",fontFamily:"inherit",whiteSpace:"nowrap",cursor:"pointer"}}>{f.charAt(0).toUpperCase()+f.slice(1)} ({clips.filter(c=>f==="all"||c.status===f).length})</button>))}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(clip=>{const camp=campaigns.find(c=>c.id===clip.campaignId);return(<div key={clip.id} style={{background:"var(--bg1)",borderRadius:14,border:"1px solid var(--border)",padding:"14px 14px"}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10,marginBottom:10}}>
            <div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:500,marginBottom:3,lineHeight:1.4}}>{clip.title}</div><div style={{fontSize:12,color:"var(--text2)"}}>{camp?.streamer} · {clip.platform} · {clip.date}</div></div>
            <Badge type={clip.status==="paid"?"green":clip.status==="pending"?"amber":"red"}>{clip.status}</Badge>
          </div>
          <div style={{display:"flex",gap:16,padding:"10px 0",borderTop:"1px solid var(--border)",marginBottom:8}}>
            <div><div style={{fontSize:10,color:"var(--text2)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3}}>Views</div><div style={{fontSize:16,fontWeight:600}}>{fmtViews(clip.views)}</div></div>
            <div><div style={{fontSize:10,color:"var(--text2)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3}}>Earned</div><div style={{fontSize:16,fontWeight:600,color:clip.earned>0?"var(--green-text)":"var(--text2)"}}>{fmtMoney(clip.earned)}</div></div>
          </div>
          <a href={clip.url} target="_blank" rel="noreferrer" style={{fontSize:12,color:"var(--purple-text)",wordBreak:"break-all"}}>{clip.url}</a>
        </div>);})}
        {filtered.length===0&&<div style={{padding:32,textAlign:"center",fontSize:14,color:"var(--text2)",background:"var(--bg1)",borderRadius:14,border:"1px solid var(--border)"}}>No clips found</div>}
      </div>
    </div>
  </AppShell>);
}
