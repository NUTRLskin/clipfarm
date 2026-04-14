"use client";
import {Avatar,Badge,Btn,ProgressBar,fmtViews,fmtMoney,pct} from "./ui";
import type {Campaign} from "@/lib/mockData";
export default function CampaignCard({campaign,isCreator,onSubmit,onManage}:{campaign:Campaign;isCreator?:boolean;onSubmit?:(c:Campaign)=>void;onManage?:(c:Campaign)=>void}){
  const p=pct(campaign.deliveredViews,campaign.targetViews);
  return(<div style={{background:"var(--bg2)",borderRadius:14,border:"1px solid var(--border)",overflow:"hidden"}}>
    <div style={{padding:"14px 14px 12px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
      <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
        <Avatar initials={campaign.initials} size={40}/>
        <div style={{minWidth:0}}>
          <div style={{fontSize:14,fontWeight:600,color:"var(--text0)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{campaign.streamer}</div>
          <div style={{fontSize:11,color:"var(--text2)",marginTop:1}}>{fmtViews(campaign.targetViews)} target · {fmtMoney(campaign.budget)}</div>
        </div>
      </div>
      <Badge type={campaign.status==="open"?"green":campaign.status==="upcoming"?"amber":"default"}>{campaign.status}</Badge>
    </div>
    <div style={{padding:"12px 14px"}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--text1)"}}><span>Views delivered</span><span style={{fontWeight:500,color:"var(--text0)"}}>{fmtViews(campaign.deliveredViews)} / {fmtViews(campaign.targetViews)}</span></div>
      <ProgressBar value={p}/>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--text2)",marginBottom:14}}><span>{campaign.clipsAccepted} clips</span><span>{fmtMoney(campaign.budgetUsed)} spent</span></div>
      <div style={{display:"flex",gap:8}}>
        {!isCreator&&<Btn full primary onClick={()=>onSubmit?.(campaign)} disabled={campaign.status!=="open"}>Submit clip</Btn>}
        {isCreator&&<Btn full primary onClick={()=>onManage?.(campaign)}>Manage</Btn>}
      </div>
    </div>
  </div>);
}
