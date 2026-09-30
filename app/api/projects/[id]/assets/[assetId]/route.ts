import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { removeObject } from "@/lib/storage";
import { getOwnedProject, requireUser, route, HttpError } from "@/lib/studio";

type Ctx = { params: Promise<{ id: string; assetId: string }> };

/** Word-level transcript (source time) for the caption generator. */
export const GET = route(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id, assetId } = await params;
  const p = await getOwnedProject(id, user.id);
  const [a] = await getDb().select().from(schema.assets).where(and(eq(schema.assets.id, assetId), eq(schema.assets.projectId, p.id)));
  if (!a) throw new HttpError(404, "Asset not found");
  return NextResponse.json({ transcript: (a.meta as any)?.transcript || null });
});

export const DELETE = route(async (_req: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id, assetId } = await params;
  const p = await getOwnedProject(id, user.id);
  const [a] = await getDb().delete(schema.assets).where(and(eq(schema.assets.id, assetId), eq(schema.assets.projectId, p.id))).returning();
  if (a) for (const k of [a.key, a.proxyKey, a.thumbsKey, a.waveKey]) if (k) removeObject(k).catch(() => {});
  return NextResponse.json({ ok: true });
});
