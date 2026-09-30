import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getBuffer } from "@/lib/storage";
import { getTikTokAccess } from "@/lib/tiktok";
import { getOwnedProject, requireUser, route, HttpError } from "@/lib/studio";

/**
 * Send the latest export to the clipper's TikTok drafts (Content Posting API, FILE_UPLOAD).
 * Requires the `video.upload` scope on the TikTok app. The clipper finishes posting in TikTok,
 * then submits the public link to the campaign as usual.
 */
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const p = await getOwnedProject((await params).id, user.id);
  const tt = await getTikTokAccess(req);
  if (!tt) throw new HttpError(400, "Connect your TikTok account first");
  if (!p.exportAssetId) throw new HttpError(400, "Export the video first");
  const [a] = await getDb().select().from(schema.assets).where(and(eq(schema.assets.id, p.exportAssetId), eq(schema.assets.projectId, p.id)));
  if (!a?.key || a.status !== "ready") throw new HttpError(400, "Export isn't ready yet");

  const buf = await getBuffer(a.key);
  const init = await fetch("https://open.tiktokapis.com/v2/post/publish/inbox/video/init/", {
    method: "POST", headers: { Authorization: `Bearer ${tt.accessToken}`, "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify({ source_info: { source: "FILE_UPLOAD", video_size: buf.length, chunk_size: buf.length, total_chunk_count: 1 } }),
  });
  const j: any = await init.json();
  if (!init.ok || j?.error?.code !== "ok") {
    const code = j?.error?.code || init.status;
    if (code === "scope_not_authorized") throw new HttpError(403, "Reconnect TikTok and allow video uploads");
    throw new HttpError(502, `TikTok rejected the upload: ${j?.error?.message || code}`);
  }
  const up = await fetch(j.data.upload_url, {
    method: "PUT", headers: { "Content-Type": "video/mp4", "Content-Range": `bytes 0-${buf.length - 1}/${buf.length}`, "Content-Length": String(buf.length) },
    body: new Uint8Array(buf),
  });
  if (!up.ok) throw new HttpError(502, `Upload to TikTok failed (${up.status})`);
  return NextResponse.json({ ok: true, publishId: j.data.publish_id });
});
