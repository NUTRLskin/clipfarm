"use client";
import {useEffect,useState} from "react";
import {useSession} from "next-auth/react";
import AppShell from "@/components/AppShell";
import CampaignCard from "@/components/CampaignCard";
import SubmitClipModal from "@/components/SubmitClipModal";
import {MetricCard,Badge,Btn,fmtViews,fmtMoney,pct,ProgressBar,Avatar} from "@/components/ui";
import type {Campaign,Clip} from "@/lib/mockData";
export default function CampaignsPage(){
  const {data:session}=useSession();
  const [campaigns,setCampaigns]=useState<Campaign[]>([]);
  const [filter,setFilter]=useState<"all"|"open"|"upcoming">("all");
  const [submitFor,setSubmitFor]=useState<Campaign|null>(null);
  useEffect(()=>{fetch("/api/campaigns").then(r=>r.json()).then(setCampaigns);},[]);
  const filtered=filter==="all"?campaigns:campaigns.filter(c=>c.status===filter);
  const [tiktokRequired,setTiktokRequired]=useState(false);
  const [toast,setToast]=useState<string|null>(null);
  useEffect(()=>{fetch("/api/auth/providers").then(r=>r.json()).then(p=>setTiktokRequired(!!p.tiktok)).catch(()=>{});},[]);
  const tiktokConnected=!!(session?.user as any)?.tiktokConnected;
  return(<AppShell>
    <div style={{maxWidth:700,margin:"0 auto"}}>
      <div style={{marginBottom:20}}><div style={{fontSize:22,fontWeight:700}}>Browse campaigns</div></div>
      <div style={{display:"flex",gap:8,marginBottom:20,overflowX:"auto",paddingBottom:2}}>
        {(["all","open","upcoming"] as const).map(f=>(<button key={f} onClick={()=>setFilter(f)} style={{padding:"7px 16px",borderRadius:20,border:"none",fontSize:13,background:filter===f?"var(--purple)":"var(--bg3)",color:filter===f?"#fff":"var(--text1)",fontFamily:"inherit",whiteSpace:"nowrap",cursor:"pointer"}}>{f.charAt(0).toUpperCase()+f.slice(1)}</button>))}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {filtered.map(c=>(<CampaignCard key={c.id} campaign={c} onSubmit={setSubmitFor}/>))}
      </div>
      {toast&&<div style={{position:"fixed",left:16,right:16,bottom:90,margin:"0 auto",maxWidth:420,background:"var(--green-dim)",color:"var(--green-text)",padding:"12px 16px",borderRadius:12,fontSize:14,textAlign:"center",zIndex:60}}>{toast}</div>}
    </div>
    {submitFor&&<SubmitClipModal campaign={submitFor} tiktokConnected={tiktokConnected} tiktokRequired={tiktokRequired} onClose={()=>setSubmitFor(null)} onSubmitted={()=>{setSubmitFor(null);setToast("Clip submitted — track it in My clips");setTimeout(()=>setToast(null),3500);}}/>}
  </AppShell>);
}
