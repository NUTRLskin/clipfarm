import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { presignPut } from "@/lib/storage";
import { assetView, getOwnedProject, requireUser, route, HttpError } from "@/lib/studio";

const KINDS: Record<string, { kind: "video" | "image" | "audio"; max: number }> = {
  "video/mp4": { kind: "video", max: 2 * 1024 ** 3 }, "video/quicktime": { kind: "video", max: 2 * 1024 ** 3 }, "video/webm": { kind: "video", max: 2 * 1024 ** 3 },
  "image/png": { kind: "image", max: 30 * 1024 ** 2 }, "image/jpeg": { kind: "image", max: 30 * 1024 ** 2 }, "image/webp": { kind: "image", max: 30 * 1024 ** 2 }, "image/gif": { kind: "image", max: 30 * 1024 ** 2 },
  "audio/mpeg": { kind: "audio", max: 200 * 1024 ** 2 }, "audio/mp4": { kind: "audio", max: 200 * 1024 ** 2 }, "audio/x-m4a": { kind: "audio", max: 200 * 1024 ** 2 }, "audio/wav": { kind: "audio", max: 200 * 1024 ** 2 }, "audio/ogg": { kind: "audio", max: 200 * 1024 ** 2 },
};
const EXT: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/wav": "wav", "audio/ogg": "ogg" };

/** Step 1 of an upload: create the asset and hand back a URL the browser PUTs the file to. */
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const p = await getOwnedProject((await params).id, user.id);
  const { name, type, size } = await req.json();
  const spec = KINDS[type];
  if (!spec) throw new HttpError(400, "Unsupported file type — use MP4/MOV/WebM, PNG/JPG/WebP/GIF, or MP3/M4A/WAV");
  if (Number(size) > spec.max) throw new HttpError(413, "File is too large");
  const [a] = await getDb().insert(schema.assets).values({ projectId: p.id, kind: spec.kind, name: String(name || "upload").slice(0, 120), status: "pending" }).returning();
  const key = `projects/${p.id}/assets/${a.id}/source.${EXT[type]}`;
  await getDb().update(schema.assets).set({ key }).where(eq(schema.assets.id, a.id));
  return NextResponse.json({ asset: assetView({ ...a, key }), uploadUrl: await presignPut(key, type) }, { status: 201 });
});

