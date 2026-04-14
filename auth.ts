import NextAuth from "next-auth";
import Twitch from "next-auth/providers/twitch";
import Credentials from "next-auth/providers/credentials";

const providers: any[] = [];

if (process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET) {
  providers.push(Twitch({
    clientId: process.env.TWITCH_CLIENT_ID,
    clientSecret: process.env.TWITCH_CLIENT_SECRET,
  }));
} else {
  providers.push(Credentials({
    name: "Demo",
    credentials: {},
    async authorize() {
      return { id: "demo-user", name: "Demo User", email: "demo@clipfarm.app" };
    },
  }));
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  secret: process.env.AUTH_SECRET || "dev-secret-change-in-prod",
  session: { strategy: "jwt" },
  callbacks: {
    async session({ session, token }) {
      if (session.user) session.user.id = token.sub!;
      return session;
    },
  },
  trustHost: true,
  pages: { signIn: "/login" },
});
