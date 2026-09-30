import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { enqueue } from "@/lib/jobs";
import { getOwnedProject, jobView, requireUser, route, HttpError } from "@/lib/studio";

export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const p = await getOwnedProject((await params).id, user.id);
  if (!process.env.OPENAI_API_KEY) throw new HttpError(503, "Auto captions aren't enabled on this server yet");
  const { assetId } = await req.json();
  const [a] = await getDb().select().from(schema.assets).where(and(eq(schema.assets.id, assetId), eq(schema.assets.projectId, p.id)));
  if (!a) throw new HttpError(404, "Asset not found");
  if (a.status !== "ready") throw new HttpError(400, "Clip is still processing");
  if (!a.hasAudio) throw new HttpError(400, "This clip has no audio to transcribe");
  const job = await enqueue(p.id, "transcribe", { assetId: a.id });
  return NextResponse.json(jobView(job), { status: 201 });
});
