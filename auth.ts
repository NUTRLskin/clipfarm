import NextAuth from "next-auth";
import Twitch from "next-auth/providers/twitch";
import Credentials from "next-auth/providers/credentials";

const providers: any[] = [];

if (process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET) {
    providers.push(Twitch({
          clientId: process.env.TWITCH_CLIENT_ID,
          clientSecret: process.env.TWITCH_CLIENT_SECRET,
    }));
}

// Demo Clipper credentials provider — always available so the
// Clipper login button works even when Twitch is configured.
providers.push(Credentials({
    id: "clipper-demo",
    name: "Clipper Demo",
    credentials: {},
    async authorize() {
          return {
                  id: "demo-clipper",
                  name: "Demo Clipper",
                  email: "clipper@clipfarm.app",
                  role: "clipper",
          } as any;
    },
}));

// Fallback Creator demo — only registered if Twitch is NOT configured,
// so local/dev environments can still log in as a streamer.
if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
    providers.push(Credentials({
          id: "creator-demo",
          name: "Creator Demo",
          credentials: {},
          async authorize() {
                  return {
                            id: "demo-creator",
                            name: "Demo Creator",
                            email: "creator@clipfarm.app",
                            role: "creator",
                  } as any;
          },
    }));
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers,
    secret: process.env.AUTH_SECRET || "dev-secret-change-in-prod",
    session: { strategy: "jwt" },
    callbacks: {
          async jwt({ token, user, account }) {
                  // On initial sign-in, persist the role on the JWT.
            if (user) {
                      const u: any = user;
                      if (u.role) {
                                  token.role = u.role;
                      } else if (account?.provider === "twitch") {
                                  token.role = "creator";
                      }
            }
                  return token;
          },
          async session({ session, token }) {
                  if (session.user) {
                            (session.user as any).id = token.sub!;
                            (session.user as any).role = (token as any).role || "creator";
                  }
                  return session;
          },
    },
    trustHost: true,
    pages: { signIn: "/login" },
});
