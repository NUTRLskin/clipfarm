import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { enqueue } from "@/lib/jobs";
import { referencedAssets } from "@/lib/editor/compositor";
import { totalDuration } from "@/lib/editor/timeline";
import { assetsByIds, getOwnedProject, jobView, requireUser, route, HttpError } from "@/lib/studio";
import type { Timeline } from "@/lib/editor/types";

export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const p = await getOwnedProject((await params).id, user.id);
  const { timeline } = await req.json() as { timeline: Timeline };
  if (!timeline?.tracks) throw new HttpError(400, "Invalid timeline");
  const dur = totalDuration(timeline);
  if (dur < 1) throw new HttpError(400, "Add a clip to the timeline first");
  if (dur > 600) throw new HttpError(400, "Exports are limited to 10 minutes");
  const ids = [...referencedAssets(timeline)];
  const found = await assetsByIds(p.id, ids);
  if (found.length !== ids.length) throw new HttpError(400, "Timeline references media that no longer exists");
  const busy = found.find(a => a.status !== "ready");
  if (busy) throw new HttpError(400, `"${busy.name}" is still processing`);
  // Save the timeline that's being exported, then queue the render.
  await getDb().update(schema.projects).set({ timeline, updatedAt: new Date() }).where(eq(schema.projects.id, p.id));
  const [exp] = await getDb().insert(schema.assets).values({ projectId: p.id, kind: "export", name: `${p.title}.mp4`, status: "pending" }).returning();
  const job = await enqueue(p.id, "render", { timeline, exportAssetId: exp.id });
  return NextResponse.json(jobView(job), { status: 201 });
});
