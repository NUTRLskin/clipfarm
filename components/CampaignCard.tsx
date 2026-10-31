"use client";
import {Avatar,Btn,ProgressBar,fmtViews,fmtMoney,pct} from "./ui";
import {useRouter} from "next/navigation";
import {Scissors,Upload,Settings2} from "lucide-react";
import {ContractBadge,ic} from "./PageKit";
import {CPM,type Campaign} from "@/lib/mockData";

/** A contract: who it's for, what it pays, how much budget is left.
 *  `quiet` drops the purple Submit button to secondary (for screens that already have a primary action). */
export default function CampaignCard({campaign,isCreator,onSubmit,onManage,quiet}:{campaign:Campaign;isCreator?:boolean;onSubmit?:(c:Campaign)=>void;onManage?:(c:Campaign)=>void;quiet?:boolean}){
  const router=useRouter();
  const left=Math.max(0,campaign.budget-campaign.budgetUsed);
  const leftPct=pct(left,campaign.budget);
  const open=campaign.status==="open";
  return(<div className="cf-card" style={{padding:16,display:"flex",flexDirection:"column",gap:14,minWidth:0}}>
    <div style={{display:"flex",alignItems:"center",gap:12,minWidth:0}}>
      <Avatar initials={campaign.initials} size={40}/>
      <div style={{flex:1,minWidth:0}}>
        <div className="cf-ellipsis" style={{fontSize:15,fontWeight:600}}>{campaign.streamer}</div>
        <div className="cf-meta cf-ellipsis">twitch.tv/{campaign.twitchUser}</div>
      </div>
      {(!open||campaign.funded===false)&&<ContractBadge status={campaign.funded===false?"funding":campaign.status}/>}
    </div>

    <div style={{display:"flex",alignItems:"baseline",gap:8,flexWrap:"wrap"}}>
      <span className="num money" style={{fontSize:28,fontWeight:500,lineHeight:1.1}}>{fmtMoney(campaign.rate ?? CPM)}</span>
      <span className="cf-sub">per 1K verified views</span>
    </div>

    <div>
      <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:13,color:"var(--text-2)",flexWrap:"wrap"}}>
        <span>Budget left</span>
        <span><span className="num" style={{color:"var(--text)"}}>{fmtMoney(left)}</span> <span style={{color:"var(--text-3)"}}>of <span className="num">{fmtMoney(campaign.budget)}</span></span></span>
      </div>
      <ProgressBar value={leftPct}/>
      <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}} className="cf-meta">
        <span><span className="num">{campaign.clipsAccepted}</span> clip{campaign.clipsAccepted===1?"":"s"} accepted</span>
        <span><span className="num">{fmtViews(campaign.deliveredViews)}</span> verified views</span>
      </div>
    </div>

    <div style={{display:"flex",gap:8}}>
      {!isCreator&&<Btn full onClick={()=>router.push("/studio")} disabled={!open}><Scissors {...ic}/>Open Farm</Btn>}
      {!isCreator&&<Btn full primary={!quiet} onClick={()=>onSubmit?.(campaign)} disabled={!open}><Upload {...ic}/>Submit clip</Btn>}
      {isCreator&&<Btn full onClick={()=>onManage?.(campaign)}><Settings2 {...ic}/>Manage</Btn>}
    </div>
  </div>);
}
