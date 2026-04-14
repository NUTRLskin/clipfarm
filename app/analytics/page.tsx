"use client";
import {useEffect,useState} from "react";
import {useSession} from "next-auth/react";
import AppShell from "@/components/AppShell";
import CampaignCard from "@/components/CampaignCard";
import {MetricCard,Badge,Btn,fmtViews,fmtMoney,pct,ProgressBar,Avatar} from "@/components/ui";
import type {Campaign,Clip} from "@/lib/mockData";
export default function AnalyticsPage(){
  const [campaigns,setCampaigns]=useState<Campaign[]>([]);
  const [clips,setClips]=useState<Clip[]>([]);
  useEffect(()=>{fetch("/api/campaigns").then(r=>r.json()).then(setCampaigns);fetch("/api/clips").then(r=>r.json()).then(setClips);},[]);
  const totalViews=campaigns.reduce((a,c)=>a+c.deliveredViews,0);
  const totalSpent=campaigns.reduce((a,c)=>a+c.budgetUsed,0);
  return(<AppShell>
    <div style={{maxWidth:700,margin:"0 auto"}}>
      <div style={{marginBottom:20}}><div style={{fontSize:22,fontWeight:700}}>Analytics</div></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24}}>
        <MetricCard label="Total views" value={fmtViews(totalViews)} sub="delivered"/>
        <MetricCard label="Budget spent" value={fmtMoney(totalSpent)} sub="all campaigns"/>
        <MetricCard label="Clips accepted" value={String(campaigns.reduce((a,c)=>a+c.clipsAccepted,0))} sub="total"/>
        <MetricCard label="Eff. CPM" value={totalViews>0?fmtMoney((totalSpent/totalViews)*1000):"$0.00"} sub="avg"/>
      </div>
      {campaigns.map(c=>(<div key={c.id} style={{background:"var(--bg1)",borderRadius:14,border:"1px solid var(--border)",padding:16,marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}><Avatar initials={c.initials} size={36}/><div style={{flex:1}}><div style={{fontSize:14,fontWeight:600}}>{c.streamer}</div></div><Badge type={c.status==="open"?"green":"amber"}>{c.status}</Badge></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          {[["Views",fmtViews(c.deliveredViews)],["Budget",fmtMoney(c.budgetUsed)],["Clips",String(c.clipsAccepted)],["Progress",pct(c.deliveredViews,c.targetViews)+"%"]].map(([l,v])=>(<div key={l} style={{background:"var(--bg3)",borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:10,color:"var(--text2)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{l}</div><div style={{fontSize:16,fontWeight:600}}>{v}</div></div>))}
        </div>
        <ProgressBar value={pct(c.deliveredViews,c.targetViews)}/>
      </div>))}
    </div>
  </AppShell>);
}
