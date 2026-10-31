"use client";
import {useEffect,useState} from "react";
import {Check,X,ExternalLink} from "lucide-react";
import AppShell from "@/components/AppShell";
import {PageHeader,EmptyState,Btn,fmtMoney} from "@/components/ui";
import {Page,StatusBadge,ErrorState,ListSkeleton,LinkBtn,getJSON,ic} from "@/components/PageKit";
import {CPM,type Campaign,type Clip} from "@/lib/mockData";

export default function ReviewPage(){
  const [clips,setClips]=useState<Clip[]|null>(null);
  const [campaigns,setCampaigns]=useState<Campaign[]>([]);
  const [error,setError]=useState<string|null>(null);
  const [views,setViews]=useState<Record<string,string>>({});
  const [processing,setProcessing]=useState<string|null>(null);
  const [actErr,setActErr]=useState<string|null>(null);
  function load(){
    setError(null);setClips(null);
    getJSON<Clip[]>("/api/clips?as=creator").then(setClips).catch(e=>setError(e.message));
    getJSON<Campaign[]>("/api/campaigns?mine=1").then(setCampaigns).catch(()=>{});
  }
  useEffect(load,[]); // eslint-disable-line react-hooks/exhaustive-deps
  async function handleAction(id:string,action:"approve"|"reject"){
    setProcessing(id);setActErr(null);
    const typedRaw=(views[id]??"").trim();const v=typedRaw===""?undefined:Number(typedRaw);
    if(v!==undefined&&(!Number.isFinite(v)||v<0)){setActErr("Views must be a number of 0 or more.");setProcessing(null);return;}
    const res=await fetch(`/api/clips/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,views:v})});
    const j=await res.json().catch(()=>({}));
    if(!res.ok)setActErr(j.error||"Couldn't save that. Try again.");
    else if(j.capped)setActErr("Approved, but the budget only covered part of it. Top up the contract to keep going.");
    const [c,ca]=await Promise.all([fetch("/api/clips?as=creator").then(r=>r.json()),fetch("/api/campaigns?mine=1").then(r=>r.json())]);
    setClips(c);setCampaigns(ca);setProcessing(null);
  }
  const pending=(clips||[]).filter(c=>c.status==="pending");
  return(<AppShell>
    <Page>
      <PageHeader title="Review clips" sub={clips?<><span className="num">{pending.length}</span> waiting for you</>:"Approve clips to pay the clipper."}/>
      {error&&<ErrorState title="Couldn't load clips" message={error} onRetry={load}/>}
      {actErr&&<div className="cf-card" role="alert" style={{padding:"12px 14px",marginBottom:12,color:"var(--warn)",background:"var(--warn-tint)",borderColor:"transparent"}}>{actErr}</div>}
      {!clips&&!error&&<ListSkeleton rows={3} height={150}/>}
      {clips&&pending.length===0&&<EmptyState title="All caught up" body="New clips from clippers show up here for you to approve." action={<LinkBtn href="/my-campaigns">See your contracts</LinkBtn>}/>}
      <div className="cf-list">
        {pending.map((clip,i)=>{const camp=campaigns.find(c=>c.id===clip.campaignId);const busy=processing===clip.id;const typed=Number(views[clip.id]);return(<div key={clip.id} className="cf-card" style={{padding:16,minWidth:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:15,fontWeight:500,wordBreak:"break-word"}}>{clip.title}</div>
              <div className="cf-meta" style={{marginTop:2}}>By {clip.submittedBy}{camp?` · ${camp.streamer}`:""} · {clip.platform==="tiktok"?"TikTok":clip.platform} · {clip.date}</div>
            </div>
            <StatusBadge status="pending"/>
          </div>
          <a href={clip.url} target="_blank" rel="noreferrer" className="cf-link" style={{margin:"10px 0 14px"}}>Watch clip<ExternalLink {...ic} size={14}/></a>
          <div style={{display:"flex",gap:8,alignItems:"flex-end",flexWrap:"wrap"}}>
            <label className="cf-field" style={{flex:"1 1 180px",marginBottom:0}}>
              <span className="cf-label">Verified views</span>
              <input type="number" inputMode="numeric" className="num" placeholder={clip.views?`${clip.views.toLocaleString()} (from TikTok)`:"e.g. 50000"} value={views[clip.id]||""} onChange={e=>setViews(p=>({...p,[clip.id]:e.target.value}))}/>
            </label>
            <div style={{display:"flex",gap:8}}>
              <Btn ghost disabled={busy} onClick={()=>handleAction(clip.id,"reject")}><X {...ic}/>Reject</Btn>
              <Btn primary={i===0} disabled={busy} onClick={()=>handleAction(clip.id,"approve")}><Check {...ic}/>{busy?"Saving…":"Approve"}</Btn>
            </div>
          </div>
          {views[clip.id]&&<div className="cf-meta" style={{marginTop:8}}>Payout: <span className="num money" style={{fontSize:14}}>{fmtMoney(Math.min((typed||0)*(camp?.rate??CPM)/1000,Math.max(0,(camp?.budget??Infinity)-(camp?.budgetUsed??0))/1.2))}</span></div>}
        </div>);})}
      </div>
    </Page>
  </AppShell>);
}
