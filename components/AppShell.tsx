"use client";
import {useState,useEffect,useMemo} from "react";
import Link from "next/link";
import {useSession,signOut} from "next-auth/react";
import {useRouter,usePathname} from "next/navigation";
import {Home,Handshake,Sprout,LayoutGrid,Wallet,Film,Users,CheckCircle2,BarChart3,Inbox,Search,LogOut,FileText,ChevronsUpDown,X,Settings,type LucideIcon} from "lucide-react";
import Logo from "@/components/site/Logo";
import {fmtMoney} from "@/components/ui";

type Mode="clipper"|"creator";
type NavItem={href:string;label:string;icon:LucideIcon;hero?:boolean};
// PRD 5: never more than five items in the main nav. Inbox lives in the top bar.
const CLIPPER_NAV:NavItem[]=[{href:"/dashboard",label:"Home",icon:Home},{href:"/campaigns",label:"Contracts",icon:Handshake},{href:"/studio",label:"Farm",icon:Sprout,hero:true},{href:"/my-clips",label:"Library",icon:LayoutGrid},{href:"/earnings",label:"Money",icon:Wallet}];
const CREATOR_NAV:NavItem[]=[{href:"/my-campaigns",label:"Contracts",icon:Handshake},{href:"/vods",label:"VODs",icon:Film},{href:"/review",label:"Review",icon:CheckCircle2},{href:"/clippers",label:"Clippers",icon:Users},{href:"/analytics",label:"Analytics",icon:BarChart3}];
const TITLES:Record<string,string>={"/dashboard":"Home","/campaigns":"Contracts","/studio":"Farm","/my-clips":"Library","/earnings":"Money","/inbox":"Inbox","/settings":"Settings","/my-campaigns":"Your contracts","/vods":"Your VODs","/clippers":"Clippers","/review":"Review clips","/analytics":"Analytics"};

const CLIPPER_PATHS=new Set(["/dashboard","/campaigns","/studio","/my-clips","/earnings"]);
const CREATOR_PATHS=new Set(["/my-campaigns","/review","/analytics","/vods","/clippers"]);
// /inbox is in neither set: it's shared between roles and never bounces.

function homeFor(mode:Mode){return mode==="clipper"?"/dashboard":"/my-campaigns";}
const isActive=(pathname:string|null,href:string)=>!!pathname&&(pathname===href||pathname.startsWith(href+"/"));

export default function AppShell({children}:{children:React.ReactNode}){
const {data:session,status}=useSession();
const router=useRouter();
const pathname=usePathname();
// Each account is one side: Twitch sign-in makes a streamer account, TikTok a clipper account.
const mode:Mode=(session?.user as any)?.role==="creator"?"creator":"clipper";
const hydrated=status==="authenticated";
const [terms,setTerms]=useState<{current:boolean;rate:number;feePct:number;role:string}|null>(null);
const [unread,setUnread]=useState(0);
const [earned,setEarned]=useState<number|null>(null);
const [menu,setMenu]=useState(false);
const [palette,setPalette]=useState(false);

useEffect(()=>{
if(!session)return;
let dead=false;
const tick=()=>fetch("/api/inbox").then(r=>r.ok?r.json():null).then(j=>{if(!dead&&j)setUnread((j.unread?.clipper||0)+(j.unread?.streamer||0));}).catch(()=>{});
tick();const i=setInterval(tick,20000);
return()=>{dead=true;clearInterval(i);};
},[session,pathname]);

// Earnings pill: money is the reason clippers are here, so it's always visible.
useEffect(()=>{
if(!session||mode!=="clipper")return;
fetch("/api/clips").then(r=>r.ok?r.json():null).then(j=>{if(Array.isArray(j))setEarned(j.filter((c:any)=>c.status==="paid").reduce((a:number,c:any)=>a+(c.earned||0),0));}).catch(()=>{});
},[session,mode]);

// One set of terms for everyone: anyone who hasn't accepted the current version (Twitch/TikTok
// sign-ups, or after an update) must accept before using the app.
useEffect(()=>{
if(status!=="authenticated")return;
fetch("/api/account/terms").then(r=>r.ok?r.json():null).then(j=>{if(j)setTerms(j);}).catch(()=>{});
},[status]);

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

// Ctrl+K / Cmd+K opens the command palette from anywhere.
useEffect(()=>{
const on=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setPalette(p=>!p);}if(e.key==="Escape"){setPalette(false);setMenu(false);}};
window.addEventListener("keydown",on);return()=>window.removeEventListener("keydown",on);
},[]);
useEffect(()=>{setMenu(false);setPalette(false);},[pathname]);

function handleSignOut(){
signOut({callbackUrl:"/login"});
}

const nav=mode==="clipper"?CLIPPER_NAV:CREATOR_NAV;

if(status==="loading") return(
<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)"}}>
<div className="cf-rise"><Logo size={24}/></div>
</div>
);

if(!session) return null;

const name=session.user?.name||(mode==="clipper"?"Clipper":"Streamer");
const initials=name.slice(0,2).toUpperCase();
const roleLabel=mode==="clipper"?"Clipper":"Streamer";
const title=Object.entries(TITLES).find(([k])=>isActive(pathname,k))?.[1]||"Clip Farm";
const inboxBadge=unread>0?<span className="as-badge">{unread>9?"9+":unread}</span>:null;

return(
<div className="as">
<aside className="as-rail">
<Link href={homeFor(mode)} className="as-logo" aria-label="Clip Farm home"><Logo size={20}/></Link>
<button className="as-search" onClick={()=>setPalette(true)}><Search size={15}/><span>Search</span><kbd>Ctrl K</kbd></button>
<nav className="as-nav" aria-label="App">
{nav.map(item=>{const Icon=item.icon;const active=isActive(pathname,item.href);return(
<Link key={item.href} href={item.href} className={`as-link ${active?"is-active":""}`} aria-current={active?"page":undefined}>
<Icon size={18} strokeWidth={1.75}/><span>{item.label}</span>
</Link>);})}
<Link href="/inbox" className={`as-link ${isActive(pathname,"/inbox")?"is-active":""}`}><Inbox size={18} strokeWidth={1.75}/><span>Inbox</span>{inboxBadge}</Link>
</nav>
<div className="as-acct-wrap">
<button className="as-acct" onClick={()=>setMenu(m=>!m)} aria-expanded={menu} aria-haspopup="menu">
<div className="as-av">{initials}</div>
<div className="as-acct-txt"><b>{name}</b><span>{roleLabel}</span></div>
<ChevronsUpDown size={15} color="var(--text-3)"/>
</button>
{menu&&<AccountMenu onSignOut={handleSignOut} placement="up"/>}
</div>
</aside>

<div className="as-body">
<header className="as-top">
<div className="as-top-l"><span className="as-top-logo"><Logo size={18}/></span><h1 className="as-title">{title}</h1></div>
<div className="as-top-r">
{mode==="clipper"&&earned!==null&&<Link href="/earnings" className="as-pill num" title="Approved earnings">{fmtMoney(earned)}</Link>}
<button className="as-icon as-only-phone" onClick={()=>setPalette(true)} aria-label="Search"><Search size={18}/></button>
<Link href="/inbox" className="as-icon as-only-phone" aria-label="Inbox" style={{position:"relative"}}><Inbox size={18}/>{inboxBadge}</Link>
<div style={{position:"relative"}} className="as-only-phone">
<button className="as-av as-av-btn" onClick={()=>setMenu(m=>!m)} aria-label="Account menu">{initials}</button>
{menu&&<AccountMenu onSignOut={handleSignOut} placement="down"/>}
</div>
</div>
</header>
<main className="as-main">{children}</main>
</div>

<nav className="as-tabs" aria-label="App">
{nav.map(item=>{const Icon=item.icon;const active=isActive(pathname,item.href);const hero=item.hero&&mode==="clipper";return(
<Link key={item.href} href={item.href} className={`as-tab ${active?"is-active":""} ${hero?"is-hero":""}`} aria-current={active?"page":undefined}>
<span className="as-tab-ic"><Icon size={hero?22:20} strokeWidth={1.75}/></span>
<span>{item.label}</span>
</Link>);})}
</nav>

{palette&&<Palette nav={nav} onClose={()=>setPalette(false)} mode={mode}/>}
{terms&&!terms.current&&<TermsGate info={terms} onDone={()=>setTerms({...terms,current:true})} onSignOut={handleSignOut}/>}
{menu&&<div className="as-scrim" onClick={()=>setMenu(false)}/>}

<style>{SHELL_CSS}</style>
</div>
);
}

function AccountMenu({onSignOut,placement}:{onSignOut:()=>void;placement:"up"|"down"}){
return(
<div className={`as-menu as-menu--${placement} cf-rise`} role="menu">
<Link href="/settings" className="as-mi" role="menuitem"><Settings size={16}/>Profile and settings</Link>
<Link href="/legal" className="as-mi" role="menuitem"><FileText size={16}/>Terms and privacy</Link>
<button className="as-mi" role="menuitem" onClick={onSignOut}><LogOut size={16}/>Sign out</button>
</div>
);
}

function Palette({nav,onClose,mode}:{nav:NavItem[];onClose:()=>void;mode:Mode}){
const router=useRouter();
const [q,setQ]=useState("");
const [sel,setSel]=useState(0);
const items=useMemo(()=>{
const all=[...nav.map(n=>({label:`Go to ${n.label}`,icon:n.icon,run:()=>router.push(n.href)})),
{label:"Go to Inbox",icon:Inbox,run:()=>router.push("/inbox")},
...(mode==="clipper"?[{label:"Farm a VOD",icon:Sprout,run:()=>router.push("/studio")},{label:"Find a contract",icon:Handshake,run:()=>router.push("/campaigns")}]:[]),
{label:"Profile and settings",icon:Settings,run:()=>router.push("/settings")},
{label:"Terms and privacy",icon:FileText,run:()=>router.push("/legal")}];
const s=q.trim().toLowerCase();
return s?all.filter(i=>i.label.toLowerCase().includes(s)):all;
},[q,nav,mode,router]);
useEffect(()=>setSel(0),[q]);
function key(e:React.KeyboardEvent){
if(e.key==="ArrowDown"){e.preventDefault();setSel(s=>Math.min(items.length-1,s+1));}
if(e.key==="ArrowUp"){e.preventDefault();setSel(s=>Math.max(0,s-1));}
if(e.key==="Enter"&&items[sel]){items[sel].run();onClose();}
}
return(
<div className="as-pal-wrap" onClick={onClose}>
<div className="as-pal cf-rise" onClick={e=>e.stopPropagation()} role="dialog" aria-label="Command menu">
<div className="as-pal-in"><Search size={17} color="var(--text-3)"/><input autoFocus placeholder="Type a command or page..." value={q} onChange={e=>setQ(e.target.value)} onKeyDown={key}/><button className="as-icon" onClick={onClose} aria-label="Close"><X size={16}/></button></div>
{items.length?<ul>{items.map((it,i)=>{const Icon=it.icon;return(<li key={it.label}><button className={i===sel?"sel":""} onMouseEnter={()=>setSel(i)} onClick={()=>{it.run();onClose();}}><Icon size={16}/>{it.label}</button></li>);})}</ul>:<div className="as-pal-empty">Nothing matches that.</div>}
</div>
</div>
);
}

function TermsGate({info,onDone,onSignOut}:{info:{rate:number;feePct:number;role:string};onDone:()=>void;onSignOut:()=>void}){
const [ok,setOk]=useState(false);
const [busy,setBusy]=useState(false);
const [err,setErr]=useState("");
const streamer=info.role==="creator";
async function accept(){
if(!ok){setErr("Tick the box to continue.");return;}
setBusy(true);setErr("");
const r=await fetch("/api/account/terms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({agree:true})}).catch(()=>null);
setBusy(false);
if(r?.ok) onDone(); else setErr("Couldn't save that. Try again.");
}
return(
<div className="as-pal-wrap" style={{alignItems:"center",paddingTop:16}}>
<div className="as-pal cf-rise" role="dialog" aria-modal="true" aria-labelledby="tg-h" style={{padding:24}}>
<h2 id="tg-h" style={{fontSize:20,fontWeight:600,marginBottom:8}}>The rules, in plain English</h2>
<p style={{color:"var(--text-2)",fontSize:14,marginBottom:16}}>One set of rules for everyone on Clip Farm. Read them once, tick the box, and you&apos;re in.</p>
<ul className="as-tg">
{streamer?<>
<li>Clippers earn <b className="num money">${info.rate.toFixed(2)}</b> per 1,000 verified views. You pay <b className="num">${(info.rate*(1+info.feePct/100)).toFixed(2)}</b> per 1,000: that rate plus Clip Farm&apos;s {info.feePct}% fee.</li>
<li>You prepay each contract&apos;s budget. The rate is locked when your contract goes live. Unspent budget is refundable.</li>
<li>You only pay for real views. Fake or bought views are never paid.</li>
</>:<>
<li>Every contract pays <b className="num money">${info.rate.toFixed(2)}</b> per 1,000 verified views. You keep all of it.</li>
<li>Views count for 30 days after you submit a clip. Earnings wait 7 days while we check them, then go out on Fridays once you have $10.</li>
<li>Only post clips to your own accounts. Fake or bought views mean no pay and a ban.</li>
</>}
</ul>
<label className="as-tg-ok"><input type="checkbox" checked={ok} onChange={e=>setOk(e.target.checked)}/><span>I&apos;m 18 or older and I agree to the <a href="/legal/terms" target="_blank">Terms</a>, <a href={streamer?"/legal/streamer-terms":"/legal/clipper-terms"} target="_blank">{streamer?"Streamer":"Clipper"} Terms</a> and <a href="/legal/privacy" target="_blank">Privacy Policy</a>.</span></label>
{err&&<p role="alert" style={{color:"var(--danger, #F87171)",fontSize:13,marginTop:10}}>{err}</p>}
<button className="cf-btn cf-btn--primary" style={{width:"100%",marginTop:16,height:48}} onClick={accept} disabled={busy}>{busy?"Saving...":"Agree and continue"}</button>
<button className="as-mi" style={{justifyContent:"center",marginTop:6}} onClick={onSignOut}>Sign out instead</button>
</div>
<style>{`.as-tg{display:flex;flex-direction:column;gap:10px;padding-left:18px;color:var(--text-2);font-size:14px;line-height:1.5;margin-bottom:16px}.as-tg-ok{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;color:var(--text-2);cursor:pointer}.as-tg-ok input{margin-top:3px;width:16px;height:16px;flex-shrink:0}.as-tg-ok a{color:var(--brand-400)}`}</style>
</div>
);
}

const SHELL_CSS=`
.as{min-height:100vh;background:var(--bg);color:var(--text);}
.as-rail{display:none;}
.as-body{min-width:0;}
.as-top{position:sticky;top:0;z-index:40;height:56px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 16px;background:rgba(10,10,12,0.86);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--line);}
.as-top-l{display:flex;align-items:center;gap:12px;min-width:0;}
.as-title{display:none;font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.as-top-logo{display:inline-flex;}
.as-top-r{display:flex;align-items:center;gap:6px;}
.as-pill{display:inline-flex;align-items:center;height:30px;padding:0 12px;border-radius:999px;background:var(--money-tint);color:var(--money);font-size:13px;font-weight:500;}
.as-icon{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:10px;background:none;border:none;color:var(--text-2);}
.as-icon:hover{background:var(--surface-2);color:var(--text);}
.as-av{width:30px;height:30px;border-radius:50%;background:var(--brand-tint);color:var(--brand-400);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0;}
.as-av-btn{border:none;margin-left:4px;}
.as-badge{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:var(--brand);color:#fff;font-size:10px;font-weight:600;margin-left:auto;}
.as-icon .as-badge{position:absolute;top:3px;right:2px;margin:0;min-width:16px;height:16px;}
.as-main{padding:20px 16px calc(96px + env(safe-area-inset-bottom,0px));max-width:1280px;margin:0 auto;}
.as-tabs{position:fixed;left:0;right:0;bottom:0;z-index:50;display:flex;align-items:flex-end;background:rgba(18,18,22,0.96);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-top:1px solid var(--line);padding:0 4px env(safe-area-inset-bottom,0px);}
.as-tab{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:9px 2px 8px;font-size:10.5px;color:var(--text-3);min-height:56px;justify-content:flex-end;}
.as-tab.is-active{color:var(--text);}
.as-tab.is-active .as-tab-ic{color:var(--brand-400);}
.as-tab.is-hero .as-tab-ic{width:48px;height:48px;border-radius:16px;background:var(--brand);color:#fff!important;display:flex;align-items:center;justify-content:center;margin-top:-18px;box-shadow:0 8px 24px rgba(139,92,246,0.35);}
.as-tab.is-hero{color:var(--text-2);}
.as-scrim{position:fixed;inset:0;z-index:55;}
.as-menu{position:absolute;z-index:60;width:248px;background:var(--surface-2);border:1px solid var(--line-strong);border-radius:12px;padding:6px;box-shadow:0 16px 48px rgba(0,0,0,0.5);}
.as-menu--up{bottom:calc(100% + 8px);left:0;}
.as-menu--down{top:calc(100% + 8px);right:0;}
.as-menu-h{padding:8px 10px 6px;font-size:11px;color:var(--text-3);font-weight:500;text-transform:uppercase;letter-spacing:.08em;}
.as-seg{display:flex;gap:4px;background:var(--surface-3);border-radius:8px;padding:3px;margin:0 6px 6px;}
.as-seg button{flex:1;height:30px;border:none;border-radius:6px;background:transparent;color:var(--text-2);font-size:13px;font-weight:500;}
.as-seg button.on{background:var(--brand);color:#fff;}
.as-mi{display:flex;align-items:center;gap:10px;width:100%;padding:9px 10px;border-radius:8px;background:none;border:none;color:var(--text-2);font-size:14px;text-align:left;}
.as-mi:hover{background:var(--surface-3);color:var(--text);}
.as-sep{height:1px;background:var(--line);margin:6px 4px;}
.as-pal-wrap{position:fixed;inset:0;z-index:80;background:rgba(0,0,0,0.6);display:flex;justify-content:center;align-items:flex-start;padding:12vh 16px 16px;}
.as-pal{width:100%;max-width:560px;background:var(--surface-2);border:1px solid var(--line-strong);border-radius:16px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.6);}
.as-pal-in{display:flex;align-items:center;gap:10px;padding:0 6px 0 14px;border-bottom:1px solid var(--line);}
.as-pal-in input{border:none;background:none;height:52px;font-size:16px;padding:0;}
.as-pal-in input:focus{border:none;}
.as-pal ul{list-style:none;max-height:50vh;overflow:auto;padding:6px;}
.as-pal li button{display:flex;align-items:center;gap:12px;width:100%;padding:10px 12px;border-radius:10px;border:none;background:none;color:var(--text-2);font-size:14px;text-align:left;}
.as-pal li button.sel,.as-pal li button:hover{background:var(--surface-3);color:var(--text);}
.as-pal-empty{padding:20px;text-align:center;color:var(--text-3);font-size:14px;}
@media(min-width:768px){
.as{display:grid;grid-template-columns:232px minmax(0,1fr);}
.as-rail{display:flex;flex-direction:column;position:sticky;top:0;height:100vh;padding:16px 12px;border-right:1px solid var(--line);background:var(--surface-1);}
.as-logo{padding:6px 10px 18px;display:block;}
.as-search{display:flex;align-items:center;gap:8px;height:36px;padding:0 10px;margin-bottom:14px;border-radius:8px;border:1px solid var(--line);background:var(--surface-2);color:var(--text-3);font-size:13px;}
.as-search:hover{border-color:var(--line-strong);color:var(--text-2);}
.as-search kbd{margin-left:auto;font-family:var(--font-mono);font-size:11px;color:var(--text-3);}
.as-nav{display:flex;flex-direction:column;gap:2px;}
.as-link{display:flex;align-items:center;gap:12px;height:38px;padding:0 10px;border-radius:8px;font-size:14px;color:var(--text-2);transition:background .15s var(--ease),color .15s var(--ease);}
.as-link:hover{background:var(--surface-2);color:var(--text);}
.as-link.is-active{background:var(--brand-tint);color:var(--text);}
.as-link.is-active svg{color:var(--brand-400);}
.as-acct-wrap{margin-top:auto;position:relative;}
.as-acct{display:flex;align-items:center;gap:10px;width:100%;padding:8px;border-radius:10px;border:1px solid var(--line);background:var(--surface-2);color:var(--text);text-align:left;}
.as-acct:hover{border-color:var(--line-strong);}
.as-acct-txt{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.3;}
.as-acct-txt b{font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.as-acct-txt span{font-size:11px;color:var(--text-3);}
.as-tabs,.as-only-phone,.as-top-logo{display:none!important;}
.as-title{display:block;}
.as-top{padding:0 32px;}
.as-main{padding:28px 32px 64px;}
}
`;
