"use client";
import { signIn } from "next-auth/react";
export default function LoginPage() {
  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"var(--bg0)",padding:"24px"}}>
      <div style={{width:"100%",maxWidth:360,textAlign:"center"}}>
        <div style={{fontSize:32,fontWeight:700,marginBottom:8}}>Clip<span style={{color:"var(--purple)"}}>Farm</span></div>
        <div style={{fontSize:14,color:"var(--text2)",marginBottom:48}}>Post clips. Earn money.</div>
        <div style={{background:"var(--bg1)",borderRadius:16,border:"1px solid var(--border)",padding:"32px 24px"}}>
          <div style={{fontSize:18,fontWeight:500,marginBottom:8}}>Welcome</div>
          <div style={{fontSize:13,color:"var(--text1)",marginBottom:28}}>Connect your Twitch account to start clipping or run campaigns.</div>
          <button onClick={()=>signIn("twitch",{callbackUrl:"/dashboard"})} style={{width:"100%",padding:"14px 20px",background:"var(--purple)",color:"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:600,cursor:"pointer"}}>
            Continue with Twitch
          </button>
          <div style={{marginTop:20,fontSize:12,color:"var(--text2)"}}>By continuing you agree to our Terms of Service</div>
        </div>
      </div>
    </div>
  );
}
