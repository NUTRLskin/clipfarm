import { NextResponse } from "next/server";
import { LINK_COOKIE, linkCookieValue } from "@/lib/accounts";
import { requireUser, route } from "@/lib/studio";

/**
 * POST /api/account/link — call right before signIn("tiktok" | "twitch") while signed in.
 * Sets a 10-minute signed cookie so the OAuth sign-in attaches to this account (see auth.ts).
 */
export const POST = route(async () => {
  const me = await requireUser();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(LINK_COOKIE, linkCookieValue(me.id), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 });
  return res;
});
