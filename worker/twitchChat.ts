/**
 * Chat replay sampling. Twitch exposes VOD chat only through its web GQL endpoint (no Helix
 * equivalent), so this is best-effort: any failure just drops the chat signal. Instead of
 * paging every message (100k+ for a big stream) we sample one page at each offset and use the
 * time those ~60 messages span as a density estimate — ~360 requests for a 6-hour VOD.
 */
type Sample = { t: number; perSec: number; emoteRatio: number; n: number };

const GQL = "https://gql.twitch.tv/gql";
const CLIENT_ID = process.env.TWITCH_GQL_CLIENT_ID || "kimne78kx3ncx6brgo4mv6wki5h1ko";
const HASH = process.env.TWITCH_GQL_COMMENTS_HASH || "b70a3591ff0f4e0313d126c6a1502d79a1c02baebb288227c582044aa76adf6a";

async function page(videoID: string, offset: number, signal: AbortSignal) {
  const res = await fetch(GQL, {
    method: "POST", signal,
    headers: { "Client-Id": CLIENT_ID, "Content-Type": "application/json" },
    body: JSON.stringify([{ operationName: "VideoCommentsByOffsetOrCursor", variables: { videoID, contentOffsetSeconds: Math.floor(offset) },
      extensions: { persistedQuery: { version: 1, sha256Hash: HASH } } }]),
  });
  if (!res.ok) throw new Error(`gql ${res.status}`);
  const j: any = await res.json();
  const edges: any[] = j?.[0]?.data?.video?.comments?.edges || [];
  return edges.map(e => e.node).filter(Boolean);
}

export async function sampleChat(videoID: string, duration: number, step = 60, concurrency = 4, budgetMs = 240_000): Promise<Sample[] | null> {
  const offsets: number[] = [];
  for (let t = 0; t < duration; t += step) offsets.push(t);
  const out: Sample[] = [];
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), budgetMs);
  let failures = 0, i = 0;
  const worker = async () => {
    while (i < offsets.length && !ctl.signal.aborted) {
      const t = offsets[i++];
      try {
        const nodes = await page(videoID, t, ctl.signal);
        if (!nodes.length) { out.push({ t, perSec: 0, emoteRatio: 0, n: 0 }); continue; }
        const times = nodes.map((n: any) => Number(n.contentOffsetSeconds)).filter((x: number) => Number.isFinite(x)).sort((a: number, b: number) => a - b);
        const span = Math.max(1, times[times.length - 1] - times[0]);
        const emotes = nodes.filter((n: any) => (n.message?.fragments || []).some((f: any) => f.emote)).length;
        out.push({ t, perSec: nodes.length / span, emoteRatio: emotes / nodes.length, n: nodes.length });
      } catch (e: any) {
        if (ctl.signal.aborted) break;
        if (++failures > 8 && out.length < 3) { ctl.abort(); break; } // endpoint is down/changed — give up early
      }
    }
  };
  try { await Promise.all(Array.from({ length: concurrency }, worker)); } finally { clearTimeout(timer); }
  if (out.length < Math.min(5, offsets.length)) return null;
  return out.sort((a, b) => a.t - b.t);
}
