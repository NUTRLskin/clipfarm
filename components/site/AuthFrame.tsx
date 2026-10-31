import Link from "next/link";
import Logo from "./Logo";

/** The plain logo-and-card frame used by the password reset pages. */
export default function AuthFrame({ title, sub, children }: { title: string; sub?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="af">
      <header className="af-top"><Link href="/" aria-label="Clip Farm home"><Logo size={20} /></Link></header>
      <main className="af-main">
        <div className="af-card cf-rise">
          <h1 className="cf-h1">{title}</h1>
          {sub && <p className="cf-sub" style={{ marginTop: 6 }}>{sub}</p>}
          <div style={{ marginTop: 24 }}>{children}</div>
        </div>
      </main>
      <style>{`
        .af{min-height:100vh;background:var(--bg);display:flex;flex-direction:column;}
        .af-top{height:64px;display:flex;align-items:center;padding:0 16px;max-width:1200px;width:100%;margin:0 auto;}
        .af-main{flex:1;display:flex;justify-content:center;padding:24px 16px 64px;}
        .af-card{width:100%;max-width:420px;}
        .af-form{display:grid;gap:14px;}
        .af-field{display:grid;gap:6px;font-size:13px;font-weight:500;color:var(--text-2);}
        .af-field input{height:46px;font-size:15px;}
        .af-msg{font-size:14px;line-height:1.55;padding:12px 14px;border-radius:10px;}
        .af-msg.ok{background:var(--brand-tint);color:var(--text);}
        .af-msg.err{background:var(--warn-tint);color:var(--warn);}
        .af-back{display:inline-block;margin-top:18px;font-size:14px;color:var(--brand-400);}
        @media(min-width:768px){.af-main{align-items:center;padding-bottom:120px;}.af-top{padding:0 24px;}}
      `}</style>
    </div>
  );
}
