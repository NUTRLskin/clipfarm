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
  const {data:session}=useSession();
  const [syncing,setSyncing]=useState(false);
  const [syncMsg,setSyncMsg]=useState<string|null>(null);
  const me=(session?.user as any)?.id;
  const tiktokConnected=!!(session?.user as any)?.tiktokConnected;
  async function load(){const [c,ca]=await Promise.all([fetch("/api/clips").then(r=>r.json()),fetch("/api/campaigns").then(r=>r.json())]);setClips(me&&tiktokConnected?c.filter((x:Clip)=>x.submittedById===me):c);setCampaigns(ca);}
  async function sync(){setSyncing(true);setSyncMsg(null);const r=await fetch("/api/clips/sync",{method:"POST"});const j=await r.json().catch(()=>({}));setSyncing(false);setSyncMsg(r.ok?`Updated ${j.updated} clip${j.updated===1?"":"s"} from TikTok`:(j.error||"Sync failed"));await load();}
  useEffect(()=>{if(session===undefined)return;load().then(()=>{if(tiktokConnected)sync();});// eslint-disable-next-line react-hooks/exhaustive-deps
  },[me,tiktokConnected]);
  const filtered=filter==="all"?clips:clips.filter(c=>c.status===filter);
  return(<AppShell>
    <div style={{maxWidth:700,margin:"0 auto"}}>
      <div style={{marginBottom:20,display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:12}}><div><div style={{fontSize:22,fontWeight:700}}>My clips</div><div style={{fontSize:13,color:"var(--text2)",marginTop:3}}>{clips.length} total{syncMsg?` · ${syncMsg}`:""}</div></div>{tiktokConnected&&<Btn small onClick={sync} disabled={syncing}>{syncing?"Syncing…":"↻ Sync views"}</Btn>}</div>
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
            <div><div style={{fontSize:10,color:"var(--text2)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3}}>Views</div><div style={{fontSize:16,fontWeight:600}}>{fmtViews(clip.views)}</div>{clip.viewsSyncedAt&&<div style={{fontSize:10,color:"var(--text2)",marginTop:2}}>TikTok · {new Date(clip.viewsSyncedAt).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}</div>}</div>
            <div><div style={{fontSize:10,color:"var(--text2)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3}}>Earned</div><div style={{fontSize:16,fontWeight:600,color:clip.earned>0?"var(--green-text)":"var(--text2)"}}>{fmtMoney(clip.earned)}</div></div>
          </div>
          <a href={clip.url} target="_blank" rel="noreferrer" style={{fontSize:12,color:"var(--purple-text)",wordBreak:"break-all"}}>{clip.url}</a>
        </div>);})}
        {filtered.length===0&&<div style={{padding:32,textAlign:"center",fontSize:14,color:"var(--text2)",background:"var(--bg1)",borderRadius:14,border:"1px solid var(--border)"}}>No clips found</div>}
      </div>
    </div>
  </AppShell>);
}
