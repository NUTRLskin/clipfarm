import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { enqueue } from "@/lib/jobs";
import { assetView, getOwnedProject, requireUser, route, HttpError } from "@/lib/studio";

/** Step 2 of an upload: the file is in storage — queue probing/derivatives. */
export const POST = route(async (_req: Request, { params }: { params: Promise<{ id: string; assetId: string }> }) => {
  const user = await requireUser();
  const { id, assetId } = await params;
  const p = await getOwnedProject(id, user.id);
  const [a] = await getDb().select().from(schema.assets).where(and(eq(schema.assets.id, assetId), eq(schema.assets.projectId, p.id)));
  if (!a) throw new HttpError(404, "Asset not found");
  await enqueue(p.id, "probe", { assetId: a.id });
  return NextResponse.json(assetView(a));
});
