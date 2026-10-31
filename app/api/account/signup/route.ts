import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { getUserByEmail, hashPassword, isEmail, normalizeEmail, passwordProblem, rateLimited, clientIp } from "@/lib/accounts";
import { route, HttpError } from "@/lib/studio";
import { recordAcceptance } from "@/lib/terms";

/**
 * POST /api/account/signup { email, password, name, role, agree }
 * Stores the terms acceptance (version, rate shown, time, IP) with the new account.
 * Creates the account. The page then signs in with the "password" provider.
 */
export const POST = route(async (req: Request) => {
  if (rateLimited("signup:" + clientIp(req), 10, 60 * 60_000)) throw new HttpError(429, "Too many sign-ups from this network. Try again in an hour.");
  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  const name = String(body.name ?? "").trim().slice(0, 60);
  const role = body.role === "creator" ? "creator" : "clipper";
  if (!name) throw new HttpError(400, "Add your name.");
  if (!isEmail(email)) throw new HttpError(400, "That email doesn't look right.");
  const pwIssue = passwordProblem(body.password);
  if (pwIssue) throw new HttpError(400, pwIssue);
  if (body.agree !== true) throw new HttpError(400, "Please confirm you're 18 or older and agree to the Terms.");
  if (await getUserByEmail(email)) throw new HttpError(409, "There's already an account with that email. Log in instead.");

  const now = new Date();
  let id: string;
  try {
    [{ id }] = await getDb().insert(schema.users).values({
      email, name, role, passwordHash: await hashPassword(String(body.password)),
      ageConfirmedAt: now,
    }).returning({ id: schema.users.id });
  } catch (e: any) {
    if (e?.code === "23505" || e?.cause?.code === "23505") throw new HttpError(409, "There's already an account with that email. Log in instead.");
    throw e;
  }
  await recordAcceptance(id, role, req);
  return NextResponse.json({ ok: true }, { status: 201 });
});
