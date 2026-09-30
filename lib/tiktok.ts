// TikTok API v2 helpers (Login Kit + Display API).
// Docs: https://developers.tiktok.com/doc/tiktok-api-v2-video-query
import { getToken } from "next-auth/jwt";
import { AUTH_SECRET } from "./authSecret";

const API = "https://open.tiktokapis.com/v2";

export type TikTokTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch seconds
  openId: string;
};

export type TikTokVideo = {
  id: string;
  title?: string;
  video_description?: string;
  share_url?: string;
  cover_image_url?: string;
  view_count?: number;
  like_count?: number;
  create_time?: number;
};

export const tiktokConfigured = () =>
  !!(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);

/** Pull the numeric video ID out of a TikTok URL. Resolves vm./vt. short links. */
export async function extractVideoId(rawUrl: string): Promise<string | null> {
  let url: URL;
  try { url = new URL(rawUrl.trim()); } catch { return null; }
  if (!/(^|\.)tiktok\.com$/.test(url.hostname)) return null;

  const direct = url.pathname.match(/\/(?:video|photo)\/(\d{8,})/);
  if (direct) return direct[1];

  // Short links (vm.tiktok.com/XXXX, vt.tiktok.com/XXXX, tiktok.com/t/XXXX) redirect to the full URL.
  if (/^(vm|vt)\.tiktok\.com$/.test(url.hostname) || url.pathname.startsWith("/t/")) {
    try {
      const res = await fetch(url.toString(), { method: "HEAD", redirect: "manual" });
      const loc = res.headers.get("location");
      if (loc) {
        const m = loc.match(/\/(?:video|photo)\/(\d{8,})/);
        if (m) return m[1];
      }
    } catch { /* fall through */ }
  }
  return null;
}

/**
 * Look up videos owned by the authorized user. TikTok only returns videos that
 * belong to the token's account, so a missing ID means "not this clipper's video".
 */
export async function queryVideos(accessToken: string, ids: string[]): Promise<TikTokVideo[]> {
  const fields = "id,title,video_description,share_url,cover_image_url,view_count,like_count,create_time";
  const out: TikTokVideo[] = [];
  for (let i = 0; i < ids.length; i += 20) { // API max: 20 IDs per request
    const res = await fetch(`${API}/video/query/?fields=${fields}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ filters: { video_ids: ids.slice(i, i + 20) } }),
      cache: "no-store",
    });
    const json = await res.json();
    if (json?.error?.code && json.error.code !== "ok") {
      throw new Error(`TikTok video/query failed: ${json.error.code} ${json.error.message || ""}`);
    }
    out.push(...(json?.data?.videos ?? []));
  }
  return out;
}

/** Exchange a refresh token for a new access token. */
export async function refreshTikTokToken(refreshToken: string): Promise<Omit<TikTokTokens, "openId"> & { openId?: string }> {
  const res = await fetch(`${API}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error(`TikTok token refresh failed: ${json.error || res.status} ${json.error_description || ""}`);
  }
  return {
    accessToken: json.access_token,
    // TikTok may rotate the refresh token; always keep the newest one.
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + (json.expires_in ?? 86400),
    openId: json.open_id,
  };
}

/**
 * Read the signed-in user's TikTok tokens from the (encrypted, server-only) JWT.
 * Tokens are never exposed on the client session. Refreshes if expired.
 */
export async function getTikTokAccess(req: Request): Promise<TikTokTokens | null> {
  const secret = AUTH_SECRET;
  const token: any =
    (await getToken({ req, secret, secureCookie: true })) ??
    (await getToken({ req, secret, secureCookie: false }));
  const tt: TikTokTokens | undefined = token?.tiktok;
  if (!tt?.accessToken) return null;
  if (tt.expiresAt - 60 > Date.now() / 1000) return tt;
  try {
    const fresh = await refreshTikTokToken(tt.refreshToken);
    return { ...tt, ...fresh, openId: tt.openId };
  } catch {
    return null;
  }
}
