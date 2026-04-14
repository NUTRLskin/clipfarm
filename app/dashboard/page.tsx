"use client";
import {useEffect,useState} from "react";
import {useSession} from "next-auth/react";
import AppShell from "@/components/AppShell";
import CampaignCard from "@/components/CampaignCard";
import {MetricCard,Badge,Btn,fmtViews,fmtMoney,pct,ProgressBar,Avatar} from "@/components/ui";
import type {Campaign,Clip} from "@/lib/mockData";
export default function Dashboard(){
  const {data:session}=useSession();
  const [campaigns,setCampaigns]=useState<Campaign[]>([]);
  const [clips,setClips]=useState<Clip[]>([]);
  const [submitFor,setSubmitFor]=useState<Campaign|null>(null);
  useEffect(()=>{fetch("/api/campaigns").then(r=>r.json()).then(setCampaigns);fetch("/api/clips").then(r=>r.json()).then(setClips);},[]);
  const myClips=clips;
  const myEarnings=myClips.filter(c=>c.status==="paid").reduce((a,c)=>a+c.earned,0);
  return(<AppShell>
    <div style={{maxWidth:700,margin:"0 auto"}}>
      <div style={{marginBottom:20}}><div style={{fontSize:22,fontWeight:700}}>Dashboard</div><div style={{fontSize:13,color:"var(--text2)",marginTop:3}}>Welcome back, {session?.user?.name?.split(" ")[0]||"Clipper"}</div></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24}}>
        <MetricCard label="Total views" value={fmtViews(myClips.reduce((a,c)=>a+c.views,0))} sub="all clips"/>
        <MetricCard label="Earned" value={fmtMoney(myEarnings)} sub="all time"/>
        <MetricCard label="Open campaigns" value={String(campaigns.filter(c=>c.status==="open").length)} sub="accepting clips"/>
        <MetricCard label="Approved" value={String(myClips.filter(c=>c.status==="paid").length)} sub={`${myClips.filter(c=>c.status==="pending").length} pending`}/>
      </div>
      <div style={{fontSize:14,fontWeight:600,marginBottom:12}}>Open campaigns</div>
      <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:24}}>
        {campaigns.filter(c=>c.status==="open").map(c=>(<CampaignCard key={c.id} campaign={c} onSubmit={setSubmitFor}/>))}
      </div>
      <div style={{fontSize:14,fontWeight:600,marginBottom:12}}>Recent clips</div>
      <div style={{background:"var(--bg1)",borderRadius:14,border:"1px solid var(--border)",overflow:"hidden"}}>
        {myClips.length===0&&<div style={{padding:28,textAlign:"center",fontSize:13,color:"var(--text2)"}}>No clips yet — browse a campaign</div>}
        {myClips.slice(0,5).map((clip,i)=>(<div key={clip.id} style={{padding:"13px 14px",borderBottom:i<4?"1px solid var(--border)":"none",display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{clip.title}</div><div style={{fontSize:11,color:"var(--text2)",marginTop:2}}>{fmtViews(clip.views)} views · {clip.date}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            <span style={{fontSize:13,fontWeight:600,color:clip.earned>0?"var(--green-text)":"var(--text2)"}}>{fmtMoney(clip.earned)}</span>
            <Badge type={clip.status==="paid"?"green":clip.status==="pending"?"amber":"red"}>{clip.status}</Badge>
          </div>
        </div>))}
      </div>
    </div>
  </AppShell>);
}
