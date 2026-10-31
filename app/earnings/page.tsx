"use client";
import {useEffect,useState} from "react";
import {Clock} from "lucide-react";
import AppShell from "@/components/AppShell";
import {PageHeader,SectionTitle,EmptyState,MetricCard,Skeleton,fmtViews,fmtMoney} from "@/components/ui";
import {Page,StatusBadge,ErrorState,ListSkeleton,LinkBtn,getJSON,ic} from "@/components/PageKit";
import {CPM,type Clip} from "@/lib/mockData";
import {SITE} from "@/lib/site";

export default function EarningsPage(){
  const [clips,setClips]=useState<Clip[]|null>(null);
  const [error,setError]=useState<string|null>(null);
  function load(){setError(null);setClips(null);getJSON<Clip[]>("/api/clips").then(setClips).catch(e=>setError(e.message));}
  useEffect(load,[]); // eslint-disable-line react-hooks/exhaustive-deps
  const all=clips||[];
  const paid=all.filter(c=>c.status==="paid");
  const totalEarned=paid.reduce((a,c)=>a+c.earned,0);
  const pending=all.filter(c=>c.status==="pending").reduce((a,c)=>a+(c.estimate??c.earned),0);
  return(<AppShell>
    <Page>
      <PageHeader title="Money" sub={`Every contract pays $${(SITE.rateCents/100).toFixed(2)} per 1,000 verified views. You keep 100%.`}/>

      {error&&<div style={{marginBottom:16}}><ErrorState title="Couldn't load your money" message={error} onRetry={load}/></div>}

      <div className="cf-card" style={{padding:20}}>
        <div style={{display:"flex",gap:32,flexWrap:"wrap"}}>
          <div style={{minWidth:0}}>
            <div className="cf-label">Approved</div>
            {clips?<div className="num money" style={{fontSize:40,fontWeight:500,lineHeight:1.15}}>{fmtMoney(totalEarned)}</div>:<div style={{marginTop:8}}><Skeleton h={40} w={180}/></div>}
          </div>
          <div style={{minWidth:0}}>
            <div className="cf-label">Pending</div>
            {clips?<div className="num money" style={{fontSize:40,fontWeight:500,lineHeight:1.15}}>{fmtMoney(pending)}</div>:<div style={{marginTop:8}}><Skeleton h={40} w={140}/></div>}
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"flex-start",marginTop:16,paddingTop:16,borderTop:"1px solid var(--line)"}} className="cf-sub">
          <Clock {...ic} style={{flexShrink:0,marginTop:3,color:"var(--text-3)"}}/>
          <span>Earnings wait 7 days for view checks, then pay out Fridays.</span>
        </div>
      </div>

      <div className="cf-metrics" style={{gridTemplateColumns:"repeat(2,minmax(0,1fr))",marginTop:12}}>
        <MetricCard label="Clips paid" value={clips?String(paid.length):"–"}/>
        <MetricCard label="Verified views" value={clips?fmtViews(paid.reduce((a,c)=>a+c.views,0)):"–"} sub="On paid clips"/>
      </div>

      <SectionTitle>Approved clips</SectionTitle>
      {!clips&&!error&&<ListSkeleton rows={3} height={56}/>}
      {clips&&paid.length===0&&<EmptyState title="No payouts yet" body="Once a clip clears its 7-day view check, it shows up here." action={<LinkBtn href="/studio" primary>Farm a VOD</LinkBtn>}/>}
      {paid.length>0&&<div className="cf-card cf-rows">
        {paid.map(clip=>(<div key={clip.id} className="cf-row">
          <div style={{flex:1,minWidth:0}}>
            <div className="cf-ellipsis" style={{fontSize:14,fontWeight:500}}>{clip.title}</div>
            <div className="cf-meta" style={{marginTop:2}}><span className="num">{fmtViews(clip.views)}</span> views · {clip.date}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
            <span className="num money" style={{fontSize:16,fontWeight:500}}>{fmtMoney(clip.earned)}</span>
            <StatusBadge status={clip.status}/>
          </div>
        </div>))}
      </div>}
    </Page>
  </AppShell>);
}
