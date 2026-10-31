"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink, MessageSquare, Send } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Avatar, PageHeader, EmptyState, Btn, Skeleton } from "@/components/ui";
import { ErrorState, ic } from "@/components/PageKit";
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
    try { const r = await fetch("/api/inbox"); const j = await r.json(); if (!r.ok) throw new Error(j.error); setError(null); setThreads(j.threads); return j.threads as ThreadView[]; }
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
      <div className="cf-inbox cf-rise">
        <div className={`cf-threads ${active ? "has-active" : ""}`}>
          <div style={{ padding: "0 4px" }}><PageHeader title="Inbox" sub="Messages between you and streamers or clippers." /></div>
          {error && <ErrorState title="Couldn't load messages" message={error} onRetry={loadThreads} />}
          {!threads && !error && Array.from({ length: 4 }, (_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px" }}>
              <Skeleton h={36} w={36} r={18} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}><Skeleton h={12} w="50%" /><Skeleton h={10} w="80%" /></div>
            </div>
          ))}
          {threads?.length === 0 && <EmptyState title="No conversations yet" body="Message a streamer from any Farm project. Streamers reply here." action={<Btn onClick={loadThreads}>Check again</Btn>} />}
          {threads?.map(t => (
            <button key={t.id} className={`cf-thread ${t.id === active ? "on" : ""}`} onClick={() => { setActive(t.id); router.replace(`/inbox?thread=${t.id}`); }}>
              <Avatar initials={t.with.name.slice(0, 2).toUpperCase()} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontWeight: t.unread ? 600 : 500, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.with.name}{t.with.role === "creator" && <span className="cf-meta" style={{ fontWeight: 400 }}> · streamer</span>}</span>
                  <span className="cf-meta num" style={{ flexShrink: 0 }}>{when(t.lastMessageAt)}</span>
                </div>
                <div className="cf-meta" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: t.unread ? "var(--text)" : undefined }}>{t.lastPreview || "New conversation"}</div>
              </div>
              {t.unread > 0 && <span className="cf-unread" aria-label={`${t.unread} unread`}>{t.unread}</span>}
            </button>
          ))}
        </div>
        <div className={`cf-convo ${active ? "has-active" : ""}`}>
          {current ? <Conversation thread={current} onBack={() => { setActive(null); router.replace("/inbox"); }} onSent={loadThreads} />
            : <div style={{ margin: "auto", textAlign: "center", color: "var(--text-3)", padding: 24 }}><MessageSquare {...ic} size={20} style={{ marginBottom: 8 }} /><div className="cf-sub">Pick a conversation to read it.</div></div>}
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
        <button className="cf-btn cf-btn--ghost cf-btn--sm cf-back" onClick={onBack} aria-label="Back to conversations" style={{ padding: "0 8px" }}><ArrowLeft {...ic} /></button>
        <Avatar initials={thread.with.name.slice(0, 2).toUpperCase()} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="cf-ellipsis" style={{ fontSize: 15, fontWeight: 600 }}>{thread.with.name}</div>
          <div className="cf-meta cf-ellipsis">{thread.with.role === "creator" ? `twitch.tv/${thread.with.login}` : "Clipper"}{thread.projectId && thread.with.role === "clipper" ? " · about a Farm project" : ""}</div>
        </div>
        {thread.with.login && <a className="cf-btn cf-btn--ghost cf-btn--sm" href={`https://twitch.tv/${thread.with.login}`} target="_blank" rel="noreferrer">Twitch<ExternalLink {...ic} size={14} /></a>}
      </div>
      <div className="cf-msgs">
        {msgs.length === 0 && <div className="cf-sub" style={{ textAlign: "center", padding: 20, maxWidth: 360, margin: "auto" }}>{thread.with.role === "creator" ? `Say hi to ${thread.with.name}. They'll see it in their Clip Farm inbox when they sign in with Twitch.` : "No messages yet."}</div>}
        {msgs.map(m => (
          <div key={m.id} className={`cf-msg ${m.mine ? "mine" : ""}`}>
            <div className="cf-bubble">{m.body}</div>
            <div className="cf-meta" style={{ marginTop: 2 }}>{m.mine ? "You" : m.senderName || (m.senderRole === "creator" ? "Streamer" : "Clipper")} · <span className="num">{when(m.createdAt)}</span></div>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <div className="cf-compose">
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Write a message…" rows={1} aria-label="Message"
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button className="cf-btn cf-btn--primary" disabled={!text.trim() || busy} onClick={send}><Send {...ic} />Send</button>
      </div>
    </>
  );
}
