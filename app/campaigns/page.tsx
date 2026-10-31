"use client";
import {useEffect,useState} from "react";
import {useSession} from "next-auth/react";
import {CheckCircle2} from "lucide-react";
import AppShell from "@/components/AppShell";
import CampaignCard from "@/components/CampaignCard";
import SubmitClipModal from "@/components/SubmitClipModal";
import {PageHeader,EmptyState,Btn} from "@/components/ui";
import {Page,Chips,ErrorState,ListSkeleton,Toast,getJSON,ic} from "@/components/PageKit";
import type {Campaign} from "@/lib/mockData";

export default function CampaignsPage(){
  const {data:session}=useSession();
  const [campaigns,setCampaigns]=useState<Campaign[]|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [filter,setFilter]=useState<"all"|"open"|"upcoming">("all");
  const [submitFor,setSubmitFor]=useState<Campaign|null>(null);
  function load(){setError(null);setCampaigns(null);getJSON<Campaign[]>("/api/campaigns").then(setCampaigns).catch(e=>setError(e.message));}
  useEffect(load,[]); // eslint-disable-line react-hooks/exhaustive-deps
  const list=campaigns||[];
  const filtered=filter==="all"?list:list.filter(c=>c.status===filter);
  const [tiktokRequired,setTiktokRequired]=useState(false);
  const [toast,setToast]=useState<string|null>(null);
  useEffect(()=>{fetch("/api/auth/providers").then(r=>r.json()).then(p=>setTiktokRequired(!!p.tiktok)).catch(()=>{});},[]);
  const tiktokConnected=!!(session?.user as any)?.tiktokConnected;
  return(<AppShell>
    <Page>
      <PageHeader title="Contracts" sub="Streamers pay you for every 1K verified views your clips get."/>
      <Chips value={filter} onChange={setFilter} options={[{value:"all",label:"All"},{value:"open",label:"Open"},{value:"upcoming",label:"Starting soon"}]}/>
      {error&&<ErrorState title="Couldn't load contracts" message={error} onRetry={load}/>}
      {!campaigns&&!error&&<ListSkeleton rows={4} height={220} card/>}
      {campaigns&&filtered.length===0&&(filter==="all"
        ?<EmptyState title="No contracts yet" body="When a streamer posts a contract, it shows up here." action={<Btn onClick={load}>Check again</Btn>}/>
        :<EmptyState title={filter==="open"?"No open contracts right now":"Nothing starting soon"} body="Try the full list instead." action={<Btn onClick={()=>setFilter("all")}>Show all contracts</Btn>}/>)}
      {filtered.length>0&&<div className="cf-grid-cards">
        {filtered.map(c=>(<CampaignCard key={c.id} campaign={c} onSubmit={setSubmitFor}/>))}
      </div>}
      {toast&&<Toast><CheckCircle2 {...ic} style={{color:"var(--brand-400)",flexShrink:0}}/>{toast}</Toast>}
    </Page>
    {submitFor&&<SubmitClipModal campaign={submitFor} tiktokConnected={tiktokConnected} tiktokRequired={tiktokRequired} onClose={()=>setSubmitFor(null)} onSubmitted={()=>{setSubmitFor(null);setToast("Clip submitted. Track it in your Library.");setTimeout(()=>setToast(null),3500);}}/>}
  </AppShell>);
}
