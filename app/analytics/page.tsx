"use client";
import {useEffect,useState} from "react";
import {Plus} from "lucide-react";
import AppShell from "@/components/AppShell";
import {MetricCard,PageHeader,SectionTitle,EmptyState,ProgressBar,Avatar,Skeleton,fmtViews,fmtMoney,pct} from "@/components/ui";
import {Page,ContractBadge,ErrorState,ListSkeleton,LinkBtn,getJSON,ic} from "@/components/PageKit";
import type {Campaign,Clip} from "@/lib/mockData";

export default function AnalyticsPage(){
  const [campaigns,setCampaigns]=useState<Campaign[]|null>(null);
  const [,setClips]=useState<Clip[]>([]);
  const [error,setError]=useState<string|null>(null);
  function load(){
    setError(null);setCampaigns(null);
    getJSON<Campaign[]>("/api/campaigns?mine=1").then(setCampaigns).catch(e=>setError(e.message));
    getJSON<Clip[]>("/api/clips?as=creator").then(setClips).catch(()=>{});
  }
  useEffect(load,[]); // eslint-disable-line react-hooks/exhaustive-deps
  const list=campaigns||[];
  const totalViews=list.reduce((a,c)=>a+c.deliveredViews,0);
  const totalSpent=list.reduce((a,c)=>a+c.budgetUsed,0);
  return(<AppShell>
    <Page wide>
      <PageHeader title="Analytics" sub="How your contracts are doing."/>
      {error&&<div style={{marginBottom:16}}><ErrorState title="Couldn't load analytics" message={error} onRetry={load}/></div>}
      {campaigns?(
        <div className="cf-metrics four">
          <MetricCard label="Verified views" value={fmtViews(totalViews)} sub="Delivered"/>
          <MetricCard label="Budget spent" value={fmtMoney(totalSpent)} sub="All contracts" money/>
          <MetricCard label="Clips accepted" value={String(list.reduce((a,c)=>a+c.clipsAccepted,0))} sub="Total"/>
          <MetricCard label="Effective rate" value={totalViews>0?fmtMoney((totalSpent/totalViews)*1000):"$0.00"} sub="Per 1K verified views"/>
        </div>
      ):!error&&(
        <div className="cf-metrics four">{[0,1,2,3].map(i=><div key={i} className="cf-card" style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}><Skeleton h={12} w="50%"/><Skeleton h={22} w="60%"/></div>)}</div>
      )}

      <SectionTitle>By contract</SectionTitle>
      {!campaigns&&!error&&<ListSkeleton rows={3} height={180} card/>}
      {campaigns&&list.length===0&&<EmptyState title="No contracts yet" body="Post a contract to start seeing numbers here." action={<LinkBtn href="/my-campaigns" primary><Plus {...ic}/>New contract</LinkBtn>}/>}
      {list.length>0&&<div className="cf-grid-cards">
        {list.map(c=>{const p=pct(c.deliveredViews,c.targetViews);return(<div key={c.id} className="cf-card" style={{padding:16,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
            <Avatar initials={c.initials} size={36}/>
            <div className="cf-ellipsis" style={{flex:1,fontSize:15,fontWeight:600}}>{c.streamer}</div>
            <ContractBadge status={c.status}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}}>
            {([["Verified views",fmtViews(c.deliveredViews),false],["Spent",fmtMoney(c.budgetUsed),true],["Clips",String(c.clipsAccepted),false],["Goal reached",p+"%",false]] as [string,string,boolean][]).map(([l,v,m])=>(
              <div key={l} className="cf-tile"><div className="cf-label">{l}</div><div className="num" style={{fontSize:17,fontWeight:500,color:m?"var(--money)":"var(--text)"}}>{v}</div></div>
            ))}
          </div>
          <ProgressBar value={p}/>
          <div className="cf-meta"><span className="num">{fmtViews(c.deliveredViews)}</span> of <span className="num">{fmtViews(c.targetViews)}</span> view goal</div>
        </div>);})}
      </div>}
    </Page>
  </AppShell>);
}
