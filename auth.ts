import NextAuth from "next-auth";
import Twitch from "next-auth/providers/twitch";
import TikTok from "next-auth/providers/tiktok";
import Credentials from "next-auth/providers/credentials";
import { AUTH_SECRET } from "@/lib/authSecret";
import { refreshTikTokToken, tiktokConfigured } from "@/lib/tiktok";
import { dbConfigured } from "@/lib/db";
import { cookies } from "next/headers";
import { getUserByEmail, getUserById, verifyPassword, verifyAgainstDummy, normalizeEmail, upsertExternalUser, touchLogin, rateLimited, clientIp, readLinkCookie, LINK_COOKIE } from "@/lib/accounts";

const providers: any[] = [];
const twitchConfigured = !!(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET);
/** Demo buttons log anyone into shared sample accounts, so they are opt-in (local testing only). */
const demoAllowed = process.env.ALLOW_DEMO_LOGIN === "1";

// Everyone can use email + password (accounts live in the users table).
if (dbConfigured()) {
  providers.push(Credentials({
    id: "password",
    name: "Email and password",
    credentials: { email: {}, password: {} },
    async authorize(creds, req) {
      const email = normalizeEmail(creds?.email);
      const password = String(creds?.password ?? "");
      if (!email || !password) return null;
      const ip = req ? clientIp(req as Request) : "local";
      if (rateLimited("login:" + ip, 20, 15 * 60_000) || rateLimited("login:" + email, 8, 15 * 60_000)) return null;
      const u = await getUserByEmail(email);
      // Same work whether or not the account exists, so response time doesn't reveal who has one.
      if (!u || u.role === "deleted" || !u.passwordHash) { await verifyAgainstDummy(password); return null; }
      if (!(await verifyPassword(password, u.passwordHash))) return null;
      if (u.suspendedAt) return null;
      await touchLogin(u.id);
      return { id: u.id, name: u.name || email.split("@")[0], email: u.email, role: u.role, sv: u.sessionVersion } as any;
    },
  }));
}

// Creators (streamers) sign in with Twitch.
if (twitchConfigured) {
  providers.push(Twitch({
    clientId: process.env.TWITCH_CLIENT_ID,
    clientSecret: process.env.TWITCH_CLIENT_SECRET,
  }));
}

// Clippers sign in with TikTok. video.list lets us read view counts on their own videos;
// video.upload lets Clipper Studio push exports to their TikTok drafts (Content Posting API).
// Scopes are configurable so a TikTok app without Content Posting approved can still log in.
if (tiktokConfigured()) {
  const base = TikTok({
    clientId: process.env.TIKTOK_CLIENT_KEY,
    clientSecret: process.env.TIKTOK_CLIENT_SECRET,
  }) as any;
  providers.push({
    ...base,
    authorization: {
      ...base.authorization,
      params: { ...base.authorization.params, scope: process.env.TIKTOK_SCOPES || "user.info.basic,video.list,video.upload" },
    },
  });
}

// Demo fallbacks so local/dev environments can log in without real OAuth apps.
if (demoAllowed && !tiktokConfigured()) {
  providers.push(Credentials({
    id: "clipper-demo",
    name: "Clipper Demo",
    credentials: {},
    async authorize() {
      return { id: "demo-clipper", name: "Demo Clipper", email: "clipper@clipfarm.app", role: "clipper" } as any;
    },
  }));
}
if (demoAllowed && !twitchConfigured) {
  providers.push(Credentials({
    id: "creator-demo",
    name: "Creator Demo",
    credentials: {},
    async authorize() {
      return { id: "demo-creator", name: "Demo Creator", email: "creator@clipfarm.app", role: "creator" } as any;
    },
  }));
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  secret: AUTH_SECRET,
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      const t: any = token;
      // Initial sign-in: persist role (and TikTok tokens) on the encrypted JWT.
      if (user) {
        const u: any = user;
        if (u.role) t.role = u.role;
        else if (account?.provider === "twitch") t.role = "creator";
        else if (account?.provider === "tiktok") t.role = "clipper";
        if (u.sv != null) t.sv = u.sv;
        // Every sign-in maps to one row in the users table; token.sub becomes that row id.
        if (dbConfigured() && account && account.provider !== "password") {
          const p: any = profile || {};
          // "Connect TikTok/Twitch" from a signed-in account: attach to that account, don't create a new one.
          let linkTo: string | null = null;
          if (!account.provider.endsWith("-demo")) {
            try { const jar = await cookies(); linkTo = readLinkCookie(jar.get(LINK_COOKIE)?.value); if (linkTo) jar.delete(LINK_COOKIE); } catch { /* no request cookies here */ }
          }
          token.sub = await upsertExternalUser({
            fixedId: account.provider.endsWith("-demo") ? String(u.id) : undefined,
            twitchId: account.provider === "twitch" ? String(p.sub || account.providerAccountId) : undefined,
            twitchLogin: account.provider === "twitch" ? String(p.preferred_username || p.login || "").toLowerCase() || undefined : undefined,
            tiktokOpenId: account.provider === "tiktok" ? String((account as any).open_id ?? account.providerAccountId) : undefined,
            // Only trust an email the provider says it verified; otherwise someone could claim another person's address.
            name: u.name, email: p.email_verified === true ? u.email : null, avatarUrl: u.image, role: t.role || "clipper",
            linkToUserId: linkTo,
          });
          const row = await getUserById(token.sub!);
          if (row?.suspendedAt) return null;
          t.sv = row?.sessionVersion ?? 0;
          // The account's own type wins: a streamer account stays a streamer whichever way it signs in.
          if (row) t.role = row.role;
        }
        t.checkedAt = Date.now();
      }
      // Once a minute, re-check the account: deleted accounts and sessions from before a
      // password change or reset are signed out.
      if (dbConfigured() && token.sub && Date.now() - (t.checkedAt || 0) > 60_000) {
        const row = await getUserById(token.sub).catch(() => undefined);
        if (row === null || row?.role === "deleted" || row?.suspendedAt) return null;
        if (row && (row.sessionVersion ?? 0) !== (t.sv ?? 0)) return null;
        t.checkedAt = Date.now();
        if (row?.name) token.name = row.name;
      }
      // Streamers: remember which Twitch channel this is — My VODs, Clippers and Inbox key off it.
      if (account?.provider === "twitch") {
        const p: any = profile || {};
        t.twitch = { login: String(p.preferred_username || p.login || "").toLowerCase() || undefined, id: p.sub || account.providerAccountId, avatar: p.picture || null };
      }
      if (account?.provider === "tiktok" && account.access_token) {
        t.tiktok = {
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at ?? Math.floor(Date.now() / 1000) + 86400,
          openId: (account as any).open_id ?? account.providerAccountId,
        };
      }
      // Keep the TikTok access token fresh (24h lifetime, 365d refresh token).
      if (t.tiktok?.refreshToken && t.tiktok.expiresAt - 60 < Date.now() / 1000) {
        try {
          t.tiktok = { ...t.tiktok, ...(await refreshTikTokToken(t.tiktok.refreshToken)) };
        } catch {
          delete t.tiktok; // user will need to reconnect TikTok
        }
      }
      return token;
    },
    async session({ session, token }) {
      const t: any = token;
      if (session.user) {
        (session.user as any).id = token.sub!;
        (session.user as any).role = t.role || "clipper";
        // Expose only whether TikTok is connected — never the tokens themselves.
        (session.user as any).tiktokConnected = !!t.tiktok?.accessToken;
        (session.user as any).twitchLogin = t.twitch?.login || (token.sub === "demo-creator" ? process.env.DEMO_CREATOR_TWITCH || "dlou" : undefined);
        (session.user as any).twitchAvatar = t.twitch?.avatar || null;
      }
      return session;
    },
  },
  trustHost: true,
  pages: { signIn: "/login" },
});
