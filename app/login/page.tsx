"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const hasTwitch = !!(process.env.NEXT_PUBLIC_HAS_TWITCH);

  async function handleLogin() {
    setLoading(true);
    try {
      await signIn("twitch", { callbackUrl: "/dashboard" });
    } catch(e) {
      setLoading(false);
    }
  }

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#0e0e10",padding:"24px"}}>
      <div style={{width:"100%",maxWidth:360,textAlign:"center"}}>
        <div style={{fontSize:32,fontWeight:700,marginBottom:8,color:"#efeff1"}}>
          Clip<span style={{color:"#9146ff"}}>Farm</span>
        </div>
        <div style={{fontSize:14,color:"#6b6b7a",marginBottom:48}}>Post clips. Earn money.</div>
        <div style={{background:"#18181b",borderRadius:16,border:"1px solid rgba(255,255,255,0.08)",padding:"32px 24px"}}>
          <div style={{fontSize:18,fontWeight:500,marginBottom:8,color:"#efeff1"}}>Welcome</div>
          <div style={{fontSize:13,color:"#adadb8",marginBottom:28}}>
            Connect your Twitch account to start clipping or run campaigns.
          </div>
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{width:"100%",padding:"14px 20px",background:"#9146ff",color:"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:600,cursor:loading?"not-allowed":"pointer",opacity:loading?0.7:1,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
            </svg>
            {loading ? "Connecting..." : "Continue with Twitch"}
          </button>
          <div style={{marginTop:20,fontSize:12,color:"#6b6b7a"}}>
            By continuing you agree to our Terms of Service
          </div>
        </div>
        <div style={{marginTop:32,fontSize:13,color:"#6b6b7a"}}>
          <strong style={{color:"#adadb8"}}>Clippers</strong> — browse campaigns, submit clips, get paid<br/><br/>
          <strong style={{color:"#adadb8"}}>Streamers</strong> — create campaigns, review clips, track views
        </div>
      </div>
    </div>
  );
}
