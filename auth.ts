import NextAuth from "next-auth";
import Twitch from "next-auth/providers/twitch";

const providers = [];
if (process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET) {
  providers.push(Twitch({
    clientId: process.env.TWITCH_CLIENT_ID,
    clientSecret: process.env.TWITCH_CLIENT_SECRET,
  }));
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async session({ session, token }) {
      if (session.user) { session.user.id = token.sub!; }
      return session;
    },
  },
  pages: { signIn: "/login" },
});
