"use client";
import {useEffect,useState} from "react";
import {useSession} from "next-auth/react";
import AppShell from "@/components/AppShell";
import CampaignCard from "@/components/CampaignCard";
import {MetricCard,Badge,Btn,fmtViews,fmtMoney,pct,ProgressBar,Avatar} from "@/components/ui";
import type {Campaign,Clip} from "@/lib/mockData";
export default function CampaignsPage(){
  const {data:session}=useSession();
  const [campaigns,setCampaigns]=useState<Campaign[]>([]);
  const [filter,setFilter]=useState<"all"|"open"|"upcoming">("all");
  const [submitFor,setSubmitFor]=useState<Campaign|null>(null);
  useEffect(()=>{fetch("/api/campaigns").then(r=>r.json()).then(setCampaigns);},[]);
  const filtered=filter==="all"?campaigns:campaigns.filter(c=>c.status===filter);
  async function handleSubmit(data:any){await fetch("/api/clips",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...data,submittedBy:session?.user?.name,submittedById:session?.user?.id})});setSubmitFor(null);}
  return(<AppShell>
    <div style={{maxWidth:700,margin:"0 auto"}}>
      <div style={{marginBottom:20}}><div style={{fontSize:22,fontWeight:700}}>Browse campaigns</div></div>
      <div style={{display:"flex",gap:8,marginBottom:20,overflowX:"auto",paddingBottom:2}}>
        {(["all","open","upcoming"] as const).map(f=>(<button key={f} onClick={()=>setFilter(f)} style={{padding:"7px 16px",borderRadius:20,border:"none",fontSize:13,background:filter===f?"var(--purple)":"var(--bg3)",color:filter===f?"#fff":"var(--text1)",fontFamily:"inherit",whiteSpace:"nowrap",cursor:"pointer"}}>{f.charAt(0).toUpperCase()+f.slice(1)}</button>))}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {filtered.map(c=>(<CampaignCard key={c.id} campaign={c} onSubmit={setSubmitFor}/>))}
      </div>
    </div>
  </AppShell>);
}
