"use client";
import {useEffect,useState} from "react";
import {useSession} from "next-auth/react";
import {RefreshCw,ExternalLink} from "lucide-react";
import AppShell from "@/components/AppShell";
import {PageHeader,EmptyState,Btn,fmtViews,fmtMoney} from "@/components/ui";
import {Page,Chips,StatusBadge,ErrorState,ListSkeleton,LinkBtn,getJSON,ic} from "@/components/PageKit";
import type {Campaign,Clip} from "@/lib/mockData";

export default function MyClipsPage(){
  const [clips,setClips]=useState<Clip[]|null>(null);
  const [campaigns,setCampaigns]=useState<Campaign[]>([]);
  const [error,setError]=useState<string|null>(null);
  const [filter,setFilter]=useState<"all"|"paid"|"pending"|"rejected">("all");
  const {data:session}=useSession();
  const [syncing,setSyncing]=useState(false);
  const [syncMsg,setSyncMsg]=useState<string|null>(null);
  const me=(session?.user as any)?.id;
  const tiktokConnected=!!(session?.user as any)?.tiktokConnected;
  async function load(){
    try{
      setError(null);
      const [c,ca]=await Promise.all([getJSON<Clip[]>("/api/clips"),getJSON<Campaign[]>("/api/campaigns")]);
      setClips(c);setCampaigns(ca);
    }catch(e:any){setError(e.message);}
  }
  async function sync(){setSyncing(true);setSyncMsg(null);const r=await fetch("/api/clips/sync",{method:"POST"});const j=await r.json().catch(()=>({}));setSyncing(false);setSyncMsg(r.ok?`Updated ${j.updated} clip${j.updated===1?"":"s"} from TikTok`:(j.error||"Sync failed"));await load();}
  useEffect(()=>{if(session===undefined)return;load().then(()=>{if(tiktokConnected)sync();});// eslint-disable-next-line react-hooks/exhaustive-deps
  },[me,tiktokConnected]);
  const all=clips||[];
  const filtered=filter==="all"?all:all.filter(c=>c.status===filter);
  const count=(f:string)=>all.filter(c=>f==="all"||c.status===f).length;
  const label=(f:"all"|"paid"|"pending"|"rejected",t:string)=>(<>{t} <span className="num" style={{color:"var(--text-3)"}}>{count(f)}</span></>);
  return(<AppShell>
    <Page>
      <PageHeader title="Library"
        sub={<>{clips?<><span className="num">{all.length}</span> clip{all.length===1?"":"s"}</>:"Your submitted clips"}{syncMsg?` · ${syncMsg}`:""}</>}
        action={tiktokConnected&&<Btn small onClick={sync} disabled={syncing}><RefreshCw {...ic} size={14}/>{syncing?"Syncing…":"Sync views"}</Btn>}/>
      <Chips value={filter} onChange={setFilter} options={[{value:"all",label:label("all","All")},{value:"paid",label:label("paid","Approved")},{value:"pending",label:label("pending","Pending")},{value:"rejected",label:label("rejected","Rejected")}]}/>
      {error&&<ErrorState title="Couldn't load your clips" message={error} onRetry={()=>{setClips(null);load();}}/>}
      {!clips&&!error&&<ListSkeleton rows={4} height={120}/>}
      {clips&&filtered.length===0&&(filter==="all"
        ?<EmptyState title="No clips yet" body="Clips you submit to a contract land here with their views and earnings." action={<LinkBtn href="/campaigns" primary>Browse contracts</LinkBtn>}/>
        :<EmptyState title={`No ${filter} clips`} body="Switch filters to see the rest of your Library." action={<Btn onClick={()=>setFilter("all")}>Show all clips</Btn>}/>)}
      <div className="cf-list">
        {filtered.map(clip=>{const camp=campaigns.find(c=>c.id===clip.campaignId);return(<div key={clip.id} className="cf-card" style={{padding:16,minWidth:0}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:15,fontWeight:500,lineHeight:1.4,wordBreak:"break-word"}}>{clip.title}</div>
              <div className="cf-meta" style={{marginTop:2}}>{camp?.streamer?`${camp.streamer} · `:""}{clip.platform==="tiktok"?"TikTok":clip.platform} · {clip.date}</div>
            </div>
            <StatusBadge status={clip.status}/>
          </div>
          <div style={{display:"flex",gap:24,alignItems:"flex-end",flexWrap:"wrap",marginTop:12,paddingTop:12,borderTop:"1px solid var(--line)"}}>
            <div>
              <div className="cf-label">Verified views</div>
              <div className="num" style={{fontSize:18,fontWeight:500}}>{fmtViews(clip.views)}</div>
              {clip.viewsSyncedAt&&<div className="cf-meta">TikTok · <span className="num">{new Date(clip.viewsSyncedAt).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}</span></div>}
            </div>
            <div>
              <div className="cf-label">Earned</div>
              <div className="num" style={{fontSize:18,fontWeight:500,color:clip.earned>0?"var(--money)":"var(--text-3)"}}>{fmtMoney(clip.earned)}</div>
            </div>
            <a href={clip.url} target="_blank" rel="noreferrer" className="cf-link" style={{marginLeft:"auto"}}>Watch<ExternalLink {...ic} size={14}/></a>
          </div>
        </div>);})}
      </div>
    </Page>
  </AppShell>);
}
