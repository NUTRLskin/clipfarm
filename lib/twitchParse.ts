// Pure helpers shared by server and client (no env, no fetch).

/** "3h2m10s" → seconds */
export function parseTwitchDuration(s: string): number {
  const m = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/.exec(s) || [];
  return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
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
