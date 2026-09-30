"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { Avatar } from "@/components/ui";
import type { ThreadView, MessageView } from "@/lib/inbox";
import "@/components/studio/studio.css";

const when = (d: string) => { const t = new Date(d), now = new Date(); return t.toDateString() === now.toDateString() ? t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : t.toLocaleDateString([], { month: "short", day: "numeric" }); };

export default function InboxPage() { return <Suspense fallback={null}><Inbox /></Suspense>; }

/** Clipper ↔ streamer messaging. Same page for both roles; the thread list shows the other side. */
function Inbox() {
  const router = useRouter();
  const q = useSearchParams();
  const [threads, setThreads] = useState<ThreadView[] | null>(null);
  const [active, setActive] = useState<string | null>(q.get("thread"));
  const [error, setError] = useState<string | null>(null);
  const withClipper = q.get("with");

  const loadThreads = async () => {
    try { const r = await fetch("/api/inbox"); const j = await r.json(); if (!r.ok) throw new Error(j.error); setThreads(j.threads); return j.threads as ThreadView[]; }
    catch (e: any) { setError(e.message); return []; }
  };
  useEffect(() => {
    loadThreads().then(ts => {
      if (withClipper) { const t = ts.find(t => t.clipperId === withClipper); if (t) setActive(t.id); }
      else if (!active && ts[0] && window.innerWidth > 760) setActive(ts[0].id);
    });
    const i = setInterval(loadThreads, 8000);
    return () => clearInterval(i);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const current = threads?.find(t => t.id === active) || null;
  return (
    <AppShell>
      <div className="cf-inbox">
        <div className={`cf-threads ${active ? "has-active" : ""}`}>
          <div style={{ fontSize: 22, fontWeight: 700, padding: "0 4px 10px" }}>Inbox</div>
          {error && <div className="st-err">{error}</div>}
          {threads?.length === 0 && <div className="st-empty">No conversations yet.<br /><span className="st-hint">Clippers can message a streamer from any Studio project; streamers reply here.</span></div>}
          {threads?.map(t => (
            <button key={t.id} className={`cf-thread ${t.id === active ? "on" : ""}`} onClick={() => { setActive(t.id); router.replace(`/inbox?thread=${t.id}`); }}>
              <Avatar initials={t.with.name.slice(0, 2).toUpperCase()} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontWeight: t.unread ? 700 : 500, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.with.name}{t.with.role === "creator" && <span className="st-hint"> · streamer</span>}</span>
                  <span className="st-hint" style={{ flexShrink: 0 }}>{when(t.lastMessageAt)}</span>
                </div>
                <div className="st-hint" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: t.unread ? "var(--text0)" : undefined }}>{t.lastPreview || "New conversation"}</div>
              </div>
              {t.unread > 0 && <span className="cf-unread">{t.unread}</span>}
            </button>
          ))}
        </div>
        <div className={`cf-convo ${active ? "has-active" : ""}`}>
          {current ? <Conversation thread={current} onBack={() => { setActive(null); router.replace("/inbox"); }} onSent={loadThreads} />
            : <div className="st-empty" style={{ margin: "auto" }}>Pick a conversation</div>}
        </div>
      </div>
    </AppShell>
  );
}

function Conversation({ thread, onBack, onSent }: { thread: ThreadView; onBack: () => void; onSent: () => void }) {
  const [msgs, setMsgs] = useState<MessageView[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const lastAt = useRef<string | null>(null);

  useEffect(() => {
    setMsgs([]); lastAt.current = null;
    let dead = false;
    const poll = async (full: boolean) => {
      try {
        const r = await fetch(`/api/inbox/${thread.id}${!full && lastAt.current ? `?after=${encodeURIComponent(lastAt.current)}` : ""}`);
        const j = await r.json(); if (!r.ok || dead) return;
        const list: MessageView[] = j.messages;
        if (list.length) { setMsgs(prev => full ? list : [...prev, ...list.filter(m => !prev.some(p => p.id === m.id))]); lastAt.current = list[list.length - 1].createdAt; }
      } catch { /* retry next tick */ }
    };
    poll(true);
    const i = setInterval(() => poll(false), 4000);
    return () => { dead = true; clearInterval(i); };
  }, [thread.id]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [msgs.length]);

  async function send() {
    const body = text.trim(); if (!body || busy) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/inbox/${thread.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
      const m = await r.json(); if (!r.ok) throw new Error(m.error);
      setMsgs(prev => [...prev, m]); lastAt.current = m.createdAt; setText(""); onSent();
    } catch (e: any) { alert(e.message); }
    finally { setBusy(false); }
  }

  return (
    <>
      <div className="cf-convo-head">
        <button className="st-icon cf-back" onClick={onBack}>←</button>
        <Avatar initials={thread.with.name.slice(0, 2).toUpperCase()} size={30} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{thread.with.name}</div>
          <div className="st-hint">{thread.with.role === "creator" ? `twitch.tv/${thread.with.login}` : "Clipper"}{thread.projectId && thread.with.role === "clipper" ? " · about a Studio project" : ""}</div>
        </div>
        {thread.with.login && <a className="st-btn small" href={`https://twitch.tv/${thread.with.login}`} target="_blank" rel="noreferrer">Twitch ↗</a>}
      </div>
      <div className="cf-msgs">
        {msgs.length === 0 && <div className="st-hint" style={{ textAlign: "center", padding: 20 }}>{thread.with.role === "creator" ? `Say hi to ${thread.with.name}. They'll see this in their ClipFarm inbox when they sign in with Twitch.` : "No messages yet."}</div>}
        {msgs.map(m => (
          <div key={m.id} className={`cf-msg ${m.mine ? "mine" : ""}`}>
            <div className="cf-bubble">{m.body}</div>
            <div className="st-hint">{m.mine ? "You" : m.senderName || (m.senderRole === "creator" ? "Streamer" : "Clipper")} · {when(m.createdAt)}</div>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <div className="cf-compose">
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Write a message…" rows={1}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button className="st-btn primary" disabled={!text.trim() || busy} onClick={send}>Send</button>
      </div>
    </>
  );
}
