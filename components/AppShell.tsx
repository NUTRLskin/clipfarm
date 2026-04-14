"use client";
import {useState,useEffect} from "react";
import {useSession} from "next-auth/react";
import {useRouter,usePathname} from "next/navigation";
const CLIPPER_NAV=[{href:"/dashboard",label:"Home",icon:"⊞"},{href:"/campaigns",label:"Campaigns",icon:"▶"},{href:"/my-clips",label:"Clips",icon:"✂"},{href:"/earnings",label:"Earnings",icon:"$"}];
const CREATOR_NAV=[{href:"/dashboard",label:"Home",icon:"⊞"},{href:"/my-campaigns",label:"Campaigns",icon:"▶"},{href:"/review",label:"Review",icon:"✓"},{href:"/analytics",label:"Analytics",icon:"↗"}];
export default function AppShell({children}:{children:React.ReactNode}){
  const {data:session,status}=useSession();
  const router=useRouter();
  const pathname=usePathname();
  const [mode,setMode]=useState<"clipper"|"creator">("clipper");
  useEffect(()=>{if(status==="unauthenticated")router.push("/login");},[status,router]);
  if(status==="loading")return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg0)"}}><div style={{color:"var(--text2)",fontSize:14}}>Loading...</div></div>);
  if(!session)return null;
  const nav=mode==="clipper"?CLIPPER_NAV:CREATOR_NAV;
  const initials=session.user?.name?.slice(0,2).toUpperCase()||"ME";
  return(
    <div style={{display:"flex",minHeight:"100vh",background:"var(--bg0)"}}>
      <aside style={{width:196,background:"var(--bg1)",borderRight:"1px solid var(--border)",display:"none",flexDirection:"column",padding:"0 0 16px",flexShrink:0}} className="cf-sidebar">
        <div style={{padding:"18px 16px 14px",fontSize:17,fontWeight:700,borderBottom:"1px solid var(--border)",marginBottom:10}}>Clip<span style={{color:"var(--purple)"}}>Farm</span></div>
        <div style={{padding:"6px 10px 10px"}}>
          <div style={{display:"flex",background:"var(--bg3)",borderRadius:8,padding:3,gap:2}}>
            {(["clipper","creator"] as const).map(m=>(<button key={m} onClick={()=>setMode(m)} style={{flex:1,fontSize:11,padding:"5px 0",borderRadius:6,border:"none",background:mode===m?"var(--purple)":"transparent",color:mode===m?"#fff":"var(--text2)",fontFamily:"inherit"}}>{m.charAt(0).toUpperCase()+m.slice(1)}</button>))}
          </div>
        </div>
        {nav.map(item=>(<div key={item.href} onClick={()=>router.push(item.href)} style={{padding:"10px 16px",fontSize:13,color:pathname===item.href?"var(--text0)":"var(--text2)",cursor:"pointer",borderLeft:`2px solid ${pathname===item.href?"var(--purple)":"transparent"}`,background:pathname===item.href?"rgba(145,70,255,0.1)":"transparent",fontWeight:pathname===item.href?500:400}}>{item.label}</div>))}
        <div style={{marginTop:"auto",padding:"12px 10px 0"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 10px",background:"var(--bg3)",borderRadius:8}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:"var(--purple-dim)",color:"var(--purple-text)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:500}}>{initials}</div>
            <div><div style={{fontSize:12,fontWeight:500,color:"var(--text0)"}}>{session.user?.name||"User"}</div><div style={{fontSize:10,color:"var(--purple)"}}>Twitch</div></div>
          </div>
        </div>
      </aside>
      <main style={{flex:1,padding:"20px 16px",paddingBottom:"calc(72px + env(safe-area-inset-bottom,0px))",overflowY:"auto",maxWidth:"100%"}} className="cf-main">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}} className="cf-topbar">
          <div style={{fontSize:20,fontWeight:700}}>Clip<span style={{color:"var(--purple)"}}>Farm</span></div>
          <div style={{display:"flex",background:"var(--bg3)",borderRadius:8,padding:3,gap:2}}>
            {(["clipper","creator"] as const).map(m=>(<button key={m} onClick={()=>setMode(m)} style={{fontSize:11,padding:"5px 10px",borderRadius:6,border:"none",background:mode===m?"var(--purple)":"transparent",color:mode===m?"#fff":"var(--text2)",fontFamily:"inherit"}}>{m.charAt(0).toUpperCase()+m.slice(1)}</button>))}
          </div>
        </div>
        {children}
      </main>
      <nav style={{display:"flex",position:"fixed",bottom:0,left:0,right:0,background:"var(--bg1)",borderTop:"1px solid var(--border)",zIndex:50,paddingBottom:"env(safe-area-inset-bottom,0px)"}} className="cf-bottomnav">
        {nav.map(item=>{const active=pathname===item.href;return(<button key={item.href} onClick={()=>router.push(item.href)} style={{flex:1,padding:"10px 4px 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"none",border:"none",color:active?"var(--purple)":"var(--text2)"}}><span style={{fontSize:18,lineHeight:1}}>{item.icon}</span><span style={{fontSize:10,fontWeight:active?500:400}}>{item.label}</span></button>);})}
      </nav>
      <style>{`@media(min-width:768px){.cf-sidebar{display:flex!important;}.cf-bottomnav{display:none!important;}.cf-topbar{display:none!important;}.cf-main{padding:24px 28px!important;}}`}</style>
    </div>
  );
}
