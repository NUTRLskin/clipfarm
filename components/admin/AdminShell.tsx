"use client";
import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Bell, Users, Handshake, Film, Landmark, Banknote, ShieldAlert, Scale, LifeBuoy, Activity, SlidersHorizontal, ScrollText, KeyRound,
  LogOut, Menu, X, type LucideIcon,
} from "lucide-react";
import Logo from "@/components/site/Logo";
import { ADMIN_CSS, api, type AdminState } from "./AdminKit";
import { SECTIONS, canSee, canEdit, canDo, type Perms, type Section, type Action } from "@/lib/admin/perms";

const ICONS: Record<Section, LucideIcon> = {
  home: LayoutDashboard, alerts: Bell, users: Users, contracts: Handshake, clips: Film, money: Landmark, payouts: Banknote,
  fraud: ShieldAlert, disputes: Scale, support: LifeBuoy, health: Activity, settings: SlidersHorizontal, audit: ScrollText, staff: KeyRound,
};
export const sectionHref = (s: Section) => (s === "home" ? "/admin" : `/admin/${s}`);
const GROUPS: { label: string; keys: Section[] }[] = [
  { label: "", keys: ["home", "alerts"] },
  { label: "Marketplace", keys: ["users", "contracts", "clips"] },
  { label: "Money", keys: ["money", "payouts"] },
  { label: "Trust", keys: ["fraud", "disputes", "support", "health"] },
  { label: "Admin", keys: ["settings", "audit", "staff"] },
];

type Ctx = { me: NonNullable<AdminState["me"]>; perms: Perms; can: (s: Section) => boolean; edit: (s: Section) => boolean; does: (a: Action) => boolean };
const AdminCtx = createContext<Ctx | null>(null);
export const useStaff = () => useContext(AdminCtx)!;

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "/admin";
  const [state, setState] = useState<AdminState | null>(null);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    api<AdminState>("/api/admin/auth/state").then(s => {
      if (!s.me) router.replace(s.noStaff ? "/admin/setup" : `/admin/login?next=${encodeURIComponent(pathname)}`);
      else setState(s);
    }).catch(() => router.replace("/admin/login"));
    // Only on first load; pages re-check on every API call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => setMenu(false), [pathname]);

  if (!state?.me || !state.perms) return <div className="ad-boot"><Logo size={22} /><style>{`.ad-boot{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);}`}</style></div>;

  const perms = state.perms;
  const ctx: Ctx = { me: state.me, perms, can: s => canSee(perms, s), edit: s => canEdit(perms, s), does: a => canDo(perms, a) };
  const current = SECTIONS.find(s => s.key !== "home" && pathname.startsWith(sectionHref(s.key)))?.key ?? (pathname === "/admin" ? "home" : null);
  const allowed = !current || ctx.can(current);

  async function signOut() {
    await api("/api/admin/auth/logout", { method: "POST", json: {} }).catch(() => {});
    router.replace("/admin/login");
  }

  const nav = (
    <nav className="ads-nav" aria-label="Admin">
      {GROUPS.map(g => {
        const items = g.keys.filter(k => ctx.can(k));
        if (!items.length) return null;
        return (
          <div key={g.label || "top"} className="ads-group">
            {g.label && <div className="ads-gl">{g.label}</div>}
            {items.map(k => {
              const Icon = ICONS[k];
              const active = current === k;
              return (
                <Link key={k} href={sectionHref(k)} className={`ads-link ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}>
                  <Icon size={17} strokeWidth={1.75} /><span>{SECTIONS.find(s => s.key === k)!.label}</span>
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
  const account = (
    <div className="ads-acct">
      <div className="ads-av">{state.me.name.slice(0, 2).toUpperCase()}</div>
      <div className="ads-acct-t"><b>{state.me.name}</b><span>{state.me.role[0].toUpperCase() + state.me.role.slice(1)}</span></div>
      <button className="ads-icon" onClick={signOut} aria-label="Sign out" title="Sign out"><LogOut size={16} /></button>
    </div>
  );

  return (
    <AdminCtx.Provider value={ctx}>
      <div className="ads">
        <aside className="ads-rail">
          <Link href="/admin" className="ads-brand"><Logo size={19} /><span className="ads-tag">Admin</span></Link>
          {nav}
          {account}
        </aside>
        <div className="ads-body">
          <header className="ads-top">
            <Link href="/admin" className="ads-brand"><Logo size={17} /><span className="ads-tag">Admin</span></Link>
            <button className="ads-icon" onClick={() => setMenu(true)} aria-label="Open menu" aria-expanded={menu}><Menu size={20} /></button>
          </header>
          <main className="ads-main">
            {allowed ? children : <div className="ad-empty"><b>You don&apos;t have access to this section.</b><p>Ask an Owner to turn it on for you.</p></div>}
          </main>
        </div>
        {menu && (
          <div className="ads-sheet-wrap" onClick={() => setMenu(false)}>
            <div className="ads-sheet" role="dialog" aria-modal="true" aria-label="Admin menu" onClick={e => e.stopPropagation()}>
              <div className="ads-sheet-h"><span className="ads-brand"><Logo size={17} /><span className="ads-tag">Admin</span></span><button className="ads-icon" onClick={() => setMenu(false)} aria-label="Close menu"><X size={20} /></button></div>
              {nav}
              {account}
            </div>
          </div>
        )}
      </div>
      <style>{SHELL_CSS + ADMIN_CSS}</style>
    </AdminCtx.Provider>
  );
}

const SHELL_CSS = `
.ads{min-height:100vh;background:var(--bg);color:var(--text);}
.ads-rail{display:none;}
.ads-body{min-width:0;}
.ads-top{position:sticky;top:0;z-index:40;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 12px 0 16px;background:rgba(10,10,12,0.9);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--line);}
.ads-brand{display:inline-flex;align-items:center;gap:10px;}
.ads-tag{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--brand-400);background:var(--brand-tint);padding:3px 7px;border-radius:6px;}
.ads-icon{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:10px;border:none;background:none;color:var(--text-2);flex-shrink:0;}
.ads-icon:hover{background:var(--surface-2);color:var(--text);}
.ads-main{padding:20px 16px 48px;max-width:1240px;margin:0 auto;}
.ads-nav{display:flex;flex-direction:column;gap:14px;}
.ads-group{display:flex;flex-direction:column;gap:2px;}
.ads-gl{font-size:11px;font-weight:500;color:var(--text-3);text-transform:uppercase;letter-spacing:.08em;padding:0 10px 4px;}
.ads-link{display:flex;align-items:center;gap:11px;height:36px;padding:0 10px;border-radius:8px;font-size:14px;color:var(--text-2);transition:background .15s var(--ease),color .15s var(--ease);}
.ads-link:hover{background:var(--surface-2);color:var(--text);}
.ads-link.is-active{background:var(--brand-tint);color:var(--text);}
.ads-link.is-active svg{color:var(--brand-400);}
.ads-acct{display:flex;align-items:center;gap:10px;padding:8px;border-radius:10px;border:1px solid var(--line);background:var(--surface-2);margin-top:16px;}
.ads-av{width:30px;height:30px;border-radius:50%;background:var(--brand-tint);color:var(--brand-400);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0;}
.ads-acct-t{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.3;}
.ads-acct-t b{font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ads-acct-t span{font-size:11px;color:var(--text-3);}
.ads-sheet-wrap{position:fixed;inset:0;z-index:80;background:rgba(0,0,0,0.55);}
.ads-sheet{position:absolute;top:0;right:0;bottom:0;width:min(300px,86vw);background:var(--surface-1);border-left:1px solid var(--line);padding:12px 12px 16px;display:flex;flex-direction:column;overflow-y:auto;}
.ads-sheet-h{display:flex;align-items:center;justify-content:space-between;padding:0 0 12px 6px;margin-bottom:8px;border-bottom:1px solid var(--line);}
.ads-sheet .ads-acct{margin-top:auto;}
@media(min-width:900px){
.ads{display:grid;grid-template-columns:236px minmax(0,1fr);}
.ads-rail{display:flex;flex-direction:column;position:sticky;top:0;height:100vh;overflow-y:auto;padding:18px 12px 14px;border-right:1px solid var(--line);background:var(--surface-1);}
.ads-rail .ads-brand{padding:4px 10px 22px;}
.ads-rail .ads-acct{margin-top:auto;}
.ads-top{display:none;}
.ads-main{padding:32px 36px 64px;}
}
`;
