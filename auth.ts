import NextAuth from "next-auth";
import Twitch from "next-auth/providers/twitch";
import TikTok from "next-auth/providers/tiktok";
import Credentials from "next-auth/providers/credentials";
import { AUTH_SECRET } from "@/lib/authSecret";
import { refreshTikTokToken, tiktokConfigured } from "@/lib/tiktok";

const providers: any[] = [];
const twitchConfigured = !!(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET);

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
if (!tiktokConfigured()) {
  providers.push(Credentials({
    id: "clipper-demo",
    name: "Clipper Demo",
    credentials: {},
    async authorize() {
      return { id: "demo-clipper", name: "Demo Clipper", email: "clipper@clipfarm.app", role: "clipper" } as any;
    },
  }));
}
if (!twitchConfigured) {
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
        (session.user as any).role = t.role || "creator";
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
