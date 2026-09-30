// Twitch Helix helpers (app access token). Docs: https://dev.twitch.tv/docs/api/reference/#get-videos
import { campaigns } from "./mockData";

export type VodInfo = { id: string; title: string; duration: number; createdAt: string; thumbnail: string | null; url: string; viewCount?: number };

let appToken: { token: string; exp: number } | null = null;
const twitchConfigured = () => !!(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET);

async function token() {
  if (appToken && appToken.exp > Date.now() + 60_000) return appToken.token;
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({ client_id: process.env.TWITCH_CLIENT_ID!, client_secret: process.env.TWITCH_CLIENT_SECRET!, grant_type: "client_credentials" }),
    cache: "no-store",
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Twitch token: ${j.message || res.status}`);
  appToken = { token: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return appToken.token;
}

async function helix(path: string) {
  const res = await fetch(`https://api.twitch.tv/helix/${path}`, {
    headers: { "Client-ID": process.env.TWITCH_CLIENT_ID!, Authorization: `Bearer ${await token()}` }, cache: "no-store",
  });
  if (!res.ok) throw new Error(`Twitch ${path}: ${res.status}`);
  return res.json();
}

/** "3h2m10s" → seconds */
export function parseTwitchDuration(s: string): number {
  const m = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/.exec(s) || [];
  return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}
/** "3:42:00" → seconds */
const parseClock = (s: string) => s.split(":").map(Number).reduce((a, b) => a * 60 + b, 0);

export async function listVods(twitchLogin: string): Promise<VodInfo[]> {
  if (!twitchConfigured()) {
    const c = campaigns.find(c => c.twitchUser === twitchLogin);
    return (c?.vods || []).map(v => ({ id: v.url.split("/").pop()!, title: v.title, duration: parseClock(v.duration), createdAt: v.date, thumbnail: null, url: v.url }));
  }
  const u = await helix(`users?login=${encodeURIComponent(twitchLogin)}`);
  const id = u.data?.[0]?.id;
  if (!id) return [];
  const v = await helix(`videos?user_id=${id}&type=archive&first=30`);
  return (v.data || []).map((x: any) => ({
    id: x.id, title: x.title, duration: parseTwitchDuration(x.duration), createdAt: x.created_at, url: x.url, viewCount: x.view_count,
    thumbnail: x.thumbnail_url && !x.thumbnail_url.includes("_404") ? x.thumbnail_url.replace("%{width}", "320").replace("%{height}", "180") : null,
  }));
}

/** Accepts "https://www.twitch.tv/videos/123", "twitch.tv/videos/123?t=1h2m3s" or "123". */
export function parseVodInput(input: string): { id: string; t: number } | null {
  const s = input.trim();
  if (/^\d{6,}$/.test(s)) return { id: s, t: 0 };
  const m = /twitch\.tv\/videos\/(\d+)/.exec(s);
  if (!m) return null;
  const t = /[?&]t=([\dhms]+)/.exec(s);
  return { id: m[1], t: t ? parseTwitchDuration(t[1]) : 0 };
}
