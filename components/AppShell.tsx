"use client";
import {useState,useEffect} from "react";
import {useSession,signOut} from "next-auth/react";
import {useRouter,usePathname} from "next/navigation";

const CLIPPER_NAV=[{href:"/dashboard",label:"Home",icon:"⌸"},{href:"/campaigns",label:"Campaigns",icon:"▶"},{href:"/my-clips",label:"Clips",icon:"✂"},{href:"/earnings",label:"Earnings",icon:"$"}];
const CREATOR_NAV=[{href:"/my-campaigns",label:"Campaigns",icon:"▶"},{href:"/review",label:"Review",icon:"✓"},{href:"/analytics",label:"Analytics",icon:"↗"}];

const CLIPPER_PATHS=new Set(["/dashboard","/campaigns","/my-clips","/earnings"]);
const CREATOR_PATHS=new Set(["/my-campaigns","/review","/analytics"]);

function homeFor(mode:"clipper"|"creator"){return mode==="clipper"?"/dashboard":"/my-campaigns";}

export default function AppShell({children}:{children:React.ReactNode}){
  const {data:session,status}=useSession();
  const router=useRouter();
  const pathname=usePathname();
  const [mode,setMode]=useState<"clipper"|"creator">("clipper");
  const [hydrated,setHydrated]=useState(false);

  useEffect(()=>{
    if(status!=="authenticated") return;
    const sessionRole=(session?.user as any)?.role as "clipper"|"creator"|undefined;
    let resolved:"clipper"|"creator"="clipper";
    if(sessionRole==="clipper"||sessionRole==="creator"){
      resolved=sessionRole;
    }else{
      try{
        const stored=localStorage.getItem("cf-role");
        if(stored==="clipper"||stored==="creator") resolved=stored;
      }catch{}
    }
    setMode(resolved);
    try{localStorage.setItem("cf-role",resolved);}catch{}
    setHydrated(true);
  },[status,session]);

  useEffect(()=>{
    if(status==="unauthenticated") router.push("/login");
  },[status,router]);

  useEffect(()=>{
    if(!hydrated||!pathname) return;
    if(mode==="clipper"&&CREATOR_PATHS.has(pathname)){
      router.replace(homeFor("clipper"));
    }else if(mode==="creator"&&CLIPPER_PATHS.has(pathname)){
      router.replace(homeFor("creator"));
    }
  },[mode,pathname,hydrated,router]);

  function switchMode(next:"clipper"|"creator"){
    if(next===mode) return;
    setMode(next);
    try{localStorage.setItem("cf-role",next);}catch{}
    router.push(homeFor(next));
  }

  function handleSignOut(){
    try{localStorage.removeItem("cf-role");}catch{}
    signOut({callbackUrl:"/login"});
  }

  if(status==="loading") return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0e0e10"}}>
      <div style={{color:"#6b6b7a",fontSize:14}}>Loading...</div>
    </div>
  );

  if(!session) return null;

  const nav=mode==="clipper"?CLIPPER_NAV:CREATOR_NAV;
  const name=session.user?.name||(mode==="clipper"?"Clipper":"Creator");
  const initials=name.slice(0,2).toUpperCase();
  const sessionRole=(session.user as any)?.role;
  const providerLabel=sessionRole==="creator"?"Twitch":"Demo";

  return(
    <div style={{display:"flex",minHeight:"100vh",background:"#0e0e10",color:"#efeff1",fontFamily:"-apple-system,BlinkMacSystemFont,sans-serif"}}>
      <aside style={{width:196,background:"#18181b",borderRight:"1px solid rgba(255,255,255,0.08)",display:"none",flexDirection:"column",padding:"0 0 16px",flexShrink:0}} className="cf-sidebar">
        <div style={{padding:"18px 16px 14px",fontSize:17,fontWeight:700,borderBottom:"1px solid rgba(255,255,255,0.08)",marginBottom:10}}>
          Clip<span style={{color:"#9146ff"}}>Farm</span>
        </div>
        <div style={{padding:"6px 10px 10px"}}>
          <div style={{display:"flex",background:"#26262c",borderRadius:8,padding:3,gap:2}}>
            {(["clipper","creator"] as const).map(m=>(
              <button key={m} onClick={()=>switchMode(m)} style={{flex:1,fontSize:11,padding:"5px 0",borderRadius:6,border:"none",background:mode===m?"#9146ff":"transparent",color:mode===m?"#fff":"#6b6b7a",fontFamily:"inherit",cursor:"pointer"}}>
                {m.charAt(0).toUpperCase()+m.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {nav.map(item=>(
          <div key={item.href} onClick={()=>router.push(item.href)} style={{padding:"10px 16px",fontSize:13,color:pathname===item.href?"#efeff1":"#6b6b7a",cursor:"pointer",borderLeft:`2px solid ${pathname===item.href?"#9146ff":"transparent"}`,background:pathname===item.href?"rgba(145,70,255,0.1)":"transparent",fontWeight:pathname===item.href?500:400}}>
            {item.label}
          </div>
        ))}
        <div style={{marginTop:"auto",padding:"12px 10px 0"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 10px",background:"#26262c",borderRadius:8}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:"#2a1f45",color:"#bf94ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:500}}>{initials}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:500,color:"#efeff1",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</div>
              <div style={{fontSize:10,color:"#9146ff"}}>{providerLabel}</div>
            </div>
            <button onClick={handleSignOut} title="Sign out" style={{background:"none",border:"none",color:"#6b6b7a",cursor:"pointer",fontSize:14,padding:"4px 6px"}}>⏻</button>
          </div>
        </div>
      </aside>
      <main style={{flex:1,padding:"20px 16px",paddingBottom:"calc(72px + env(safe-area-inset-bottom,0px))",overflowY:"auto"}} className="cf-main">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}} className="cf-topbar">
          <div style={{fontSize:20,fontWeight:700}}>Clip<span style={{color:"#9146ff"}}>Farm</span></div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{display:"flex",background:"#26262c",borderRadius:8,padding:3,gap:2}}>
              {(["clipper","creator"] as const).map(m=>(
                <button key={m} onClick={()=>switchMode(m)} style={{fontSize:11,padding:"5px 10px",borderRadius:6,border:"none",background:mode===m?"#9146ff":"transparent",color:mode===m?"#fff":"#6b6b7a",fontFamily:"inherit",cursor:"pointer"}}>
                  {m.charAt(0).toUpperCase()+m.slice(1)}
                </button>
              ))}
            </div>
            <button onClick={handleSignOut} title="Sign out" style={{background:"#26262c",border:"none",color:"#adadb8",cursor:"pointer",fontSize:13,padding:"6px 10px",borderRadius:6,fontFamily:"inherit"}}>⏻</button>
          </div>
        </div>
        {children}
      </main>
      <nav style={{display:"flex",position:"fixed",bottom:0,left:0,right:0,background:"#18181b",borderTop:"1px solid rgba(255,255,255,0.08)",zIndex:50,paddingBottom:"env(safe-area-inset-bottom,0px)"}} className="cf-bottomnav">
        {nav.map(item=>{const active=pathname===item.href;return(
          <button key={item.href} onClick={()=>router.push(item.href)} style={{flex:1,padding:"10px 4px 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"none",border:"none",color:active?"#9146ff":"#6b6b7a"}}>
            <span style={{fontSize:18,lineHeight:1}}>{item.icon}</span>
            <span style={{fontSize:10,fontWeight:active?500:400}}>{item.label}</span>
          </button>
        );})}
      </nav>
      <style>{`@media(min-width:768px){.cf-sidebar{display:flex!important;}.cf-bottomnav{display:none!important;}.cf-topbar{display:none!important;}.cf-main{padding:24px 28px!important;}}`}</style>
    </div>
  );
}
