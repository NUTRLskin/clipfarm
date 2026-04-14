"use client";
import {useEffect,useState} from "react";
import {useSession} from "next-auth/react";
import AppShell from "@/components/AppShell";
import CampaignCard from "@/components/CampaignCard";
import {MetricCard,Badge,Btn,fmtViews,fmtMoney,pct,ProgressBar,Avatar} from "@/components/ui";
import type {Campaign,Clip} from "@/lib/mockData";
export default function MyCampaignsPage(){
  const [campaigns,setCampaigns]=useState<Campaign[]>([]);
  const [show,setShow]=useState(false);
  const [streamer,setStreamer]=useState(""); const [budget,setBudget]=useState("500"); const [target,setTarget]=useState("1000000");
  useEffect(()=>{fetch("/api/campaigns").then(r=>r.json()).then(setCampaigns);},[]);
  async function handleCreate(){if(!streamer)return;const res=await fetch("/api/campaigns",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({streamer,initials:streamer.slice(0,2).toUpperCase(),twitchUser:streamer.toLowerCase(),budget:parseFloat(budget),targetViews:parseInt(target)})});const c=await res.json();setCampaigns(p=>[...p,c]);setShow(false);setStreamer("");}
  return(<AppShell>
    <div style={{maxWidth:700,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}><div style={{fontSize:22,fontWeight:700}}>My campaigns</div><Btn primary onClick={()=>setShow(true)}>+ New</Btn></div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {campaigns.map(c=>(<CampaignCard key={c.id} campaign={c} isCreator onManage={()=>{}}/>))}
      </div>
      {show&&<div style={{position:"fixed",inset:0,zIndex:100,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
        <div onClick={()=>setShow(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.7)"}}/>
        <div style={{position:"relative",background:"var(--bg1)",borderRadius:"20px 20px 0 0",border:"1px solid var(--border-mid)",padding:"20px 16px 32px"}}>
          <div style={{fontSize:16,fontWeight:600,marginBottom:16}}>New campaign</div>
          {[["Streamer name",streamer,setStreamer,"e.g. DLOU"],["Budget ($)",budget,setBudget,"500"],["Target views",target,setTarget,"1000000"]].map(([label,val,set,ph]:any)=>(<div key={label as string} style={{marginBottom:14}}><div style={{fontSize:12,color:"var(--text1)",marginBottom:6}}>{label as string}</div><input value={val as string} onChange={e=>set(e.target.value)} placeholder={ph as string}/></div>))}
          <Btn full primary onClick={handleCreate} disabled={!streamer}>Create campaign</Btn>
        </div>
      </div>}
    </div>
  </AppShell>);
}
