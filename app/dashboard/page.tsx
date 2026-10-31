"use client";
import {useEffect,useState} from "react";
import {useSession} from "next-auth/react";
import {Scissors,CheckCircle2,UserRound} from "lucide-react";
import SubmitClipModal from "@/components/SubmitClipModal";
import AppShell from "@/components/AppShell";
import CampaignCard from "@/components/CampaignCard";
import {MetricCard,PageHeader,SectionTitle,EmptyState,Skeleton,fmtViews,fmtMoney} from "@/components/ui";
import {Page,StatusBadge,ErrorState,ListSkeleton,LinkBtn,Toast,getJSON,ic} from "@/components/PageKit";
import type {Campaign,Clip} from "@/lib/mockData";

export default function Dashboard(){
  const {data:session}=useSession();
  const [campaigns,setCampaigns]=useState<Campaign[]|null>(null);
  const [clips,setClips]=useState<Clip[]|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [submitFor,setSubmitFor]=useState<Campaign|null>(null);
  const [toast,setToast]=useState<string|null>(null);
  const [profileDone,setProfileDone]=useState(true);
  useEffect(()=>{fetch("/api/account/profile").then(r=>r.ok?r.json():null).then(p=>{if(p)setProfileDone(!!p.complete);}).catch(()=>{});},[]);
  const [tiktokRequired,setTiktokRequired]=useState(false);
  useEffect(()=>{fetch("/api/auth/providers").then(r=>r.json()).then(p=>setTiktokRequired(!!p.tiktok)).catch(()=>{});},[]);
  const tiktokConnected=!!(session?.user as any)?.tiktokConnected;
  function load(){
    setError(null);setCampaigns(null);setClips(null);
    getJSON<Campaign[]>("/api/campaigns").then(setCampaigns).catch(e=>setError(e.message));
    getJSON<Clip[]>("/api/clips").then(setClips).catch(e=>setError(e.message));
  }
  useEffect(load,[]); // eslint-disable-line react-hooks/exhaustive-deps

  const myClips=clips||[];
  const paid=myClips.filter(c=>c.status==="paid").reduce((a,c)=>a+c.earned,0);
  const pending=myClips.filter(c=>c.status==="pending").reduce((a,c)=>a+(c.estimate??c.earned),0);
  const open=(campaigns||[]).filter(c=>c.status==="open");
  const first=session?.user?.name?.split(" ")[0];
  return(<AppShell>
    <Page>
      <PageHeader title="Home" sub={first?`Welcome back, ${first}.`:"Welcome back."}/>

      {error&&<div style={{marginBottom:16}}><ErrorState title="Couldn't load your home page" message={error} onRetry={load}/></div>}

      {clips?(
        <div className="cf-metrics odd">
          <MetricCard label="Pending" value={fmtMoney(pending)} sub="Waiting on view checks" money/>
          <MetricCard label="Approved" value={fmtMoney(paid)} sub="Earned, waiting for payout" money/>
          <MetricCard label="Total views" value={fmtViews(myClips.reduce((a,c)=>a+c.views,0))} sub={`Across ${myClips.length} clip${myClips.length===1?"":"s"}`}/>
        </div>
      ):!error&&(
        <div className="cf-metrics odd">{[0,1,2].map(i=><div key={i} className="cf-card" style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}><Skeleton h={12} w="40%"/><Skeleton h={22} w="70%"/></div>)}</div>
      )}

      {!profileDone&&<div className="cf-card cf-keep" style={{marginTop:16,borderColor:"var(--warn)"}}>
        <div style={{minWidth:0,flex:"1 1 260px"}}>
          <div style={{fontSize:16,fontWeight:600}}>Finish your profile</div>
          <div className="cf-sub" style={{marginTop:2}}>Add a username and your TikTok handle so you can submit clips and get paid.</div>
        </div>
        <LinkBtn href="/settings"><UserRound {...ic}/>Finish profile</LinkBtn>
      </div>}

      <div className="cf-card cf-keep" style={{marginTop:16}}>
        <div style={{minWidth:0,flex:"1 1 260px"}}>
          <div style={{fontSize:16,fontWeight:600}}>Keep going</div>
          <div className="cf-sub" style={{marginTop:2}}>Pick a VOD, let the Farm find the best moments, and cut your next clip.</div>
        </div>
        <LinkBtn href="/studio" primary><Scissors {...ic}/>Farm a VOD</LinkBtn>
      </div>

      <SectionTitle action={<LinkBtn href="/campaigns" ghost small>See all</LinkBtn>}>Open contracts</SectionTitle>
      {!campaigns&&!error&&<ListSkeleton rows={2} height={180} card/>}
      {campaigns&&open.length===0&&<EmptyState title="No open contracts right now" body="New contracts show up here as soon as a streamer posts one." action={<LinkBtn href="/campaigns">See all contracts</LinkBtn>}/>}
      {open.length>0&&<div className="cf-grid-cards">
        {open.map(c=>(<CampaignCard key={c.id} campaign={c} onSubmit={setSubmitFor} quiet/>))}
      </div>}

      <SectionTitle action={<LinkBtn href="/my-clips" ghost small>Library</LinkBtn>}>Recent clips</SectionTitle>
      {!clips&&!error&&<ListSkeleton rows={3} height={56}/>}
      {clips&&myClips.length===0&&<EmptyState title="No clips yet" body="Submit a clip to a contract and it shows up here." action={<LinkBtn href="/campaigns">Browse contracts</LinkBtn>}/>}
      {myClips.length>0&&<div className="cf-card cf-rows">
        {myClips.slice(0,5).map(clip=>(<div key={clip.id} className="cf-row">
          <div style={{flex:1,minWidth:0}}>
            <div className="cf-ellipsis" style={{fontSize:14,fontWeight:500}}>{clip.title}</div>
            <div className="cf-meta" style={{marginTop:2}}><span className="num">{fmtViews(clip.views)}</span> views · {clip.date}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
            <span className="num" style={{fontSize:14,fontWeight:500,color:clip.earned>0?"var(--money)":"var(--text-3)"}}>{fmtMoney(clip.earned)}</span>
            <StatusBadge status={clip.status}/>
          </div>
        </div>))}
      </div>}
      {toast&&<Toast><CheckCircle2 {...ic} style={{color:"var(--brand-400)",flexShrink:0}}/>{toast}</Toast>}
    </Page>
    {submitFor&&<SubmitClipModal campaign={submitFor} tiktokConnected={tiktokConnected} tiktokRequired={tiktokRequired} onClose={()=>setSubmitFor(null)} onSubmitted={()=>{setSubmitFor(null);setToast("Clip submitted. Track it in your Library.");setTimeout(()=>setToast(null),3500);load();}}/>}
  </AppShell>);
}
