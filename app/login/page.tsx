"use client";
import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";

export default function LoginPage() {
    const [loading, setLoading] = useState<null | "creator" | "clipper">(null);
    const [twitchAvailable, setTwitchAvailable] = useState(true);

  useEffect(() => {
        fetch("/api/auth/providers")
          .then((r) => r.json())
          .then((providers) => setTwitchAvailable(!!providers.twitch))
          .catch(() => setTwitchAvailable(false));
  }, []);

  async function loginCreator() {
        setLoading("creator");
        try { localStorage.setItem("cf-role", "creator"); } catch {}
        if (twitchAvailable) {
                await signIn("twitch", { callbackUrl: "/my-campaigns" });
        } else {
                await signIn("creator-demo", { callbackUrl: "/my-campaigns" });
        }
  }

  async function loginClipper() {
        setLoading("clipper");
        try { localStorage.setItem("cf-role", "clipper"); } catch {}
        await signIn("clipper-demo", { callbackUrl: "/dashboard" });
  }

  return (
        <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#0e0e10",padding:"24px"}}>
                <div style={{width:"100%",maxWidth:380,textAlign:"center"}}>
                          <div style={{fontSize:32,fontWeight:700,marginBottom:8,color:"#efeff1"}}>
                                      Clip<span style={{color:"#9146ff"}}>Farm</span>span>
                          </div>div>
                          <div style={{fontSize:14,color:"#6b6b7a",marginBottom:40}}>Post clips. Earn money.</div>div>

                          <div style={{background:"#18181b",borderRadius:16,border:"1px solid rgba(255,255,255,0.08)",padding:"28px 22px"}}>
                                      <div style={{fontSize:18,fontWeight:500,marginBottom:6,color:"#efeff1"}}>Choose how you want to sign in</div>div>
                                      <div style={{fontSize:13,color:"#adadb8",marginBottom:22}}>You can switch between modes later from the app.</div>div>

                            {/* Creator card */}
                                      <button onClick={loginCreator} disabled={loading!==null} style={{width:"100%",padding:"16px 18px",background:"#9146ff",color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:600,cursor:loading!==null?"not-allowed":"pointer",opacity:loading==="creator"?0.7:1,display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:12,fontFamily:"inherit"}}>
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>svg>
                                        {loading==="creator" ? "Connecting..." : twitchAvailable ? "I'm a Creator — Continue with Twitch" : "I'm a Creator (Demo)"}
                                      </button>button>
                                    <div style={{fontSize:11,color:"#6b6b7a",marginBottom:18,lineHeight:1.5}}>Run campaigns, review submissions, track payouts.</div>div>
                          
                            {/* Clipper card */}
                                    <button onClick={loginClipper} disabled={loading!==null} style={{width:"100%",padding:"16px 18px",background:"#1f1f23",color:"#efeff1",border:"1px solid rgba(255,255,255,0.12)",borderRadius:12,fontSize:15,fontWeight:600,cursor:loading!==null?"not-allowed":"pointer",opacity:loading==="clipper"?0.7:1,display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:12,fontFamily:"inherit"}}>
                                                <span style={{fontSize:18,lineHeight:1}}>✂</span>span>
                                      {loading==="clipper" ? "Connecting..." : "I'm a Clipper (Demo)"}
                                    </button>button>
                                    <div style={{fontSize:11,color:"#6b6b7a",marginBottom:6,lineHeight:1.5}}>Browse campaigns, clip from Twitch, post to TikTok, get paid.</div>div>
                                    <div style={{fontSize:11,color:"#6b6b7a",lineHeight:1.5,fontStyle:"italic"}}>TikTok login coming soon.</div>div>
                          
                                    <div style={{marginTop:22,fontSize:11,color:"#6b6b7a"}}>By continuing you agree to our Terms of Service</div>div>
                          </div>div>
                </div>div>
        </div>div>
      );
}
</svg>
