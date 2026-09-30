// Twitch Helix helpers (app access token). Docs: https://dev.twitch.tv/docs/api/reference/#get-videos
// Server only — pure parsers that the browser also needs live in ./twitchParse.
import { campaigns } from "./mockData";
import { parseTwitchDuration } from "./twitchParse";
export { parseTwitchDuration, parseVodInput } from "./twitchParse";

export type VodInfo = {
  id: string; title: string; duration: number; createdAt: string; thumbnail: string | null; url: string; viewCount?: number;
  /** Channel that owns the VOD (Helix user_login / user_name). */
  userLogin?: string; userName?: string;
};
export type ChannelInfo = { id: string; login: string; display: string; avatar: string | null; live: boolean; game?: string; title?: string };

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

/** "3:42:00" → seconds */
const parseClock = (s: string) => s.split(":").map(Number).reduce((a, b) => a * 60 + b, 0);

const mapVod = (x: any): VodInfo => ({
  id: x.id, title: x.title, duration: parseTwitchDuration(x.duration), createdAt: x.created_at, url: x.url, viewCount: x.view_count,
  userLogin: x.user_login, userName: x.user_name,
  thumbnail: x.thumbnail_url && !x.thumbnail_url.includes("_404") ? x.thumbnail_url.replace("%{width}", "320").replace("%{height}", "180") : null,
});
const mockVods = (login: string): VodInfo[] => {
  const c = campaigns.find(c => c.twitchUser === login);
  return (c?.vods || []).map(v => ({ id: v.url.split("/").pop()!, title: v.title, duration: parseClock(v.duration), createdAt: v.date, thumbnail: null, url: v.url, userLogin: c!.twitchUser, userName: c!.streamer }));
};

/** Past broadcasts (type=archive) for any channel. Only VODs the streamer has kept on Twitch are listed. */
export async function listVods(twitchLogin: string, first = 50): Promise<VodInfo[]> {
  const login = twitchLogin.toLowerCase();
  if (!twitchConfigured()) return mockVods(login);
  const u = await helix(`users?login=${encodeURIComponent(login)}`);
  const id = u.data?.[0]?.id;
  if (!id) return [];
  const v = await helix(`videos?user_id=${id}&type=archive&first=${first}`);
  return (v.data || []).map(mapVod);
}

/** One VOD by id — the authoritative owner check for imports (works for any channel). */
export async function getVod(vodId: string): Promise<VodInfo | null> {
  if (!/^\d+$/.test(vodId)) return null;
  if (!twitchConfigured()) return campaigns.flatMap(c => mockVods(c.twitchUser)).find(v => v.id === vodId) || null;
  try {
    const v = await helix(`videos?id=${vodId}`);
    const x = v.data?.[0];
    return x ? mapVod(x) : null;
  } catch (e: any) {
    if (/ 404$/.test(e.message)) return null; // Helix returns 404 for unknown/deleted video ids
    throw e;
  }
}

export type TwitchClip = { id: string; title: string; url: string; viewCount: number; createdAt: string; duration: number; vodOffset: number; thumbnail: string | null };

/**
 * Clips viewers made from this VOD, with their offset into the broadcast — the strongest
 * "this was a moment" signal there is. Pages through Helix clips for the broadcast window.
 */
export async function listClipsForVod(vodId: string, broadcasterLogin: string, startedAt: string, durationSec: number, maxPages = 6): Promise<TwitchClip[]> {
  if (!twitchConfigured()) return [];
  const u = await helix(`users?login=${encodeURIComponent(broadcasterLogin.toLowerCase())}`);
  const id = u.data?.[0]?.id;
  if (!id) return [];
  const start = new Date(startedAt), end = new Date(start.getTime() + (durationSec + 3600) * 1000);
  const out: TwitchClip[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const r = await helix(`clips?broadcaster_id=${id}&started_at=${start.toISOString()}&ended_at=${end.toISOString()}&first=100${cursor ? `&after=${cursor}` : ""}`);
    for (const c of r.data || []) {
      if (String(c.video_id) !== String(vodId) || c.vod_offset == null) continue;
      out.push({ id: c.id, title: c.title, url: c.url, viewCount: c.view_count || 0, createdAt: c.created_at, duration: Number(c.duration) || 30, vodOffset: Number(c.vod_offset), thumbnail: c.thumbnail_url || null });
    }
    cursor = r.pagination?.cursor;
    if (!cursor) break;
  }
  return out;
}

const mapChannel = (x: any): ChannelInfo => ({
  id: x.id, login: x.broadcaster_login || x.login, display: x.display_name, avatar: x.thumbnail_url || x.profile_image_url || null,
  live: !!x.is_live, game: x.game_name || undefined, title: x.title || undefined,
});

/** Search Twitch channels by name (Helix search/channels). */
export async function searchChannels(q: string, first = 10): Promise<ChannelInfo[]> {
  const query = q.trim();
  if (!query) return [];
  if (!twitchConfigured()) {
    return campaigns.filter(c => c.twitchUser.includes(query.toLowerCase()) || c.streamer.toLowerCase().includes(query.toLowerCase()))
      .map(c => ({ id: c.id, login: c.twitchUser, display: c.streamer, avatar: null, live: false }));
  }
  const r = await helix(`search/channels?query=${encodeURIComponent(query)}&first=${first}`);
  const list: ChannelInfo[] = (r.data || []).map(mapChannel);
  // Helix search is fuzzy; put an exact login match first so "xqc" finds xqc, not "xqcfan123".
  const exact = list.findIndex(c => c.login === query.toLowerCase());
  if (exact > 0) list.unshift(...list.splice(exact, 1));
  return list;
}

/** Exact channel lookup by login. */
export async function getChannel(login: string): Promise<ChannelInfo | null> {
  const l = login.trim().toLowerCase().replace(/^@/, "");
  if (!/^[a-z0-9_]{3,25}$/.test(l)) return null;
  if (!twitchConfigured()) { const c = campaigns.find(c => c.twitchUser === l); return c ? { id: c.id, login: c.twitchUser, display: c.streamer, avatar: null, live: false } : null; }
  const u = await helix(`users?login=${encodeURIComponent(l)}`);
  const x = u.data?.[0];
  return x ? mapChannel(x) : null;
}
