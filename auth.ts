import NextAuth from "next-auth";
import Twitch from "next-auth/providers/twitch";
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Twitch({ clientId: process.env.TWITCH_CLIENT_ID!, clientSecret: process.env.TWITCH_CLIENT_SECRET! })],
  callbacks: {
    async session({ session, token }) {
      if (session.user) { session.user.id = token.sub!; }
      return session;
    },
  },
  pages: { signIn: "/login" },
});
