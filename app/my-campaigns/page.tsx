"use client";
import {useEffect,useState} from "react";
import {Plus} from "lucide-react";
import AppShell from "@/components/AppShell";
import CampaignCard from "@/components/CampaignCard";
import {PageHeader,EmptyState,Btn} from "@/components/ui";
import {Page,Sheet,ErrorState,ListSkeleton,getJSON,ic} from "@/components/PageKit";
import type {Campaign} from "@/lib/mockData";

export default function MyCampaignsPage(){
  const [campaigns,setCampaigns]=useState<Campaign[]|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [show,setShow]=useState(false);
  const [createErr,setCreateErr]=useState<string|null>(null);
  const [streamer,setStreamer]=useState(""); const [budget,setBudget]=useState("500"); const [target,setTarget]=useState("1000000");
  function load(){setError(null);setCampaigns(null);getJSON<Campaign[]>("/api/campaigns?mine=1").then(setCampaigns).catch(e=>setError(e.message));}
  useEffect(load,[]); // eslint-disable-line react-hooks/exhaustive-deps
  async function handleCreate(){if(!streamer)return;setCreateErr(null);const res=await fetch("/api/campaigns",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({streamer,initials:streamer.slice(0,2).toUpperCase(),twitchUser:streamer.toLowerCase(),budget:parseFloat(budget),targetViews:parseInt(target)})});const c=await res.json().catch(()=>({}));if(!res.ok){setCreateErr(c.error||"Couldn't create the contract. Try again.");return;}setCampaigns(p=>[...(p||[]),c]);setShow(false);setStreamer("");}
  const fields:[string,string,(v:string)=>void,string,"text"|"decimal"|"numeric"][]=[["Streamer name",streamer,setStreamer,"e.g. DLOU","text"],["Budget ($)",budget,setBudget,"500","decimal"],["Target verified views",target,setTarget,"1000000","numeric"]];
  return(<AppShell>
    <Page>
      <PageHeader title="Your contracts" sub="Set a budget, and clippers get paid per 1K verified views on your clips."
        action={<Btn primary onClick={()=>setShow(true)}><Plus {...ic}/>New contract</Btn>}/>
      {error&&<ErrorState title="Couldn't load your contracts" message={error} onRetry={load}/>}
      {!campaigns&&!error&&<ListSkeleton rows={2} height={200} card/>}
      {campaigns&&campaigns.length===0&&<EmptyState title="No contracts yet" body="Post a contract and clippers start cutting your VODs." action={<Btn onClick={()=>setShow(true)}><Plus {...ic}/>New contract</Btn>}/>}
      {campaigns&&campaigns.length>0&&<div className="cf-grid-cards">
        {campaigns.map(c=>(<CampaignCard key={c.id} campaign={c} isCreator onManage={()=>{}}/>))}
      </div>}
      {show&&<Sheet title="New contract" sub="Clippers are paid from this budget for every 1K verified views." onClose={()=>setShow(false)}>
        {fields.map(([label,val,set,ph,mode])=>(<label key={label} className="cf-field"><span className="cf-label">{label}</span><input value={val} onChange={e=>set(e.target.value)} placeholder={ph} inputMode={mode} className={mode==="text"?undefined:"num"}/></label>))}
        {createErr&&<div role="alert" style={{fontSize:13,color:"var(--danger)",marginBottom:14}}>{createErr}</div>}
        <Btn full primary onClick={handleCreate} disabled={!streamer}>Create contract</Btn>
      </Sheet>}
    </Page>
  </AppShell>);
}
