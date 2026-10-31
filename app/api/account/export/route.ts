import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getUserById, publicProfile } from "@/lib/accounts";
import { clipView } from "@/lib/contracts";
import { requireUser, route, HttpError } from "@/lib/studio";

/** GET /api/account/export — everything we hold about the signed-in person, as a JSON download. */
export const GET = route(async () => {
  const s = await requireUser();
  const u = await getUserById(s.id);
  if (!u || u.role === "deleted") throw new HttpError(401, "Sign in first");
  const db = getDb();
  const [clips, contracts, projects] = await Promise.all([
    db.select().from(schema.clips).where(eq(schema.clips.clipperId, u.id)),
    db.select().from(schema.contracts).where(eq(schema.contracts.streamerUserId, u.id)),
    db.select({ id: schema.projects.id, title: schema.projects.title, campaignId: schema.projects.campaignId, twitchLogin: schema.projects.twitchLogin, createdAt: schema.projects.createdAt, updatedAt: schema.projects.updatedAt })
      .from(schema.projects).where(eq(schema.projects.ownerId, u.id)),
  ]);
  const threads = await db.select().from(schema.threads).where(eq(schema.threads.clipperId, u.id));
  const messages = threads.length ? await db.select().from(schema.messages).where(inArray(schema.messages.threadId, threads.map(t => t.id))) : [];
  const sent = await db.select().from(schema.messages).where(eq(schema.messages.senderId, u.id));
  const data = {
    exportedAt: new Date().toISOString(),
    profile: { ...publicProfile(u), ageConfirmedAt: u.ageConfirmedAt, termsAcceptedAt: u.termsAcceptedAt },
    clips: clips.map(clipView),
    contracts: contracts.map(c => ({ ...c, budget: c.budgetCents / 100, spent: c.spentCents / 100, rate: c.rateCents / 100 })),
    projects,
    messages: [...new Map([...messages, ...sent].map(m => [m.id, m])).values()],
  };
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="clipfarm-data-${new Date().toISOString().slice(0, 10)}.json"`, "Cache-Control": "no-store" },
  });
});
