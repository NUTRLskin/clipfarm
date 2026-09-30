import fs from "fs";
import os from "os";
import path from "path";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getToFile } from "@/lib/storage";
import { getTikTokAccess } from "@/lib/tiktok";
import { getOwnedProject, requireUser, route, HttpError } from "@/lib/studio";

export const maxDuration = 300;

/**
 * Send the latest export to the clipper's TikTok drafts (Content Posting API, FILE_UPLOAD).
 * Requires the `video.upload` scope. Uploads are chunked: TikTok wants 5–64 MB chunks with
 * total_chunk_count = floor(size / chunk_size) and the remainder folded into the final chunk.
 * The clipper finishes posting in TikTok, then submits the public link to the campaign as usual.
 */
const CHUNK = 10 * 1024 * 1024;
const MAX_BYTES = 4 * 1024 ** 3; // TikTok's file cap

export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const p = await getOwnedProject((await params).id, user.id);
  const tt = await getTikTokAccess(req);
  if (!tt) throw new HttpError(400, "Connect your TikTok account first");
  if (!p.exportAssetId) throw new HttpError(400, "Export the video first");
  const [a] = await getDb().select().from(schema.assets).where(and(eq(schema.assets.id, p.exportAssetId), eq(schema.assets.projectId, p.id)));
  if (!a?.key || a.status !== "ready") throw new HttpError(400, "Export isn't ready yet");

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cf-tt-"));
  const file = path.join(dir, "export.mp4");
  try {
    await getToFile(a.key, file);
    const size = fs.statSync(file).size;
    if (size > MAX_BYTES) throw new HttpError(413, "Export is larger than TikTok's 4 GB limit");
    const chunkSize = size < CHUNK ? size : CHUNK;
    const count = Math.max(1, Math.floor(size / chunkSize));

    const init = await fetch("https://open.tiktokapis.com/v2/post/publish/inbox/video/init/", {
      method: "POST", headers: { Authorization: `Bearer ${tt.accessToken}`, "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ source_info: { source: "FILE_UPLOAD", video_size: size, chunk_size: chunkSize, total_chunk_count: count } }),
    });
    const j: any = await init.json().catch(() => ({}));
    if (!init.ok || j?.error?.code !== "ok") {
      const code = j?.error?.code || init.status;
      if (code === "scope_not_authorized") throw new HttpError(403, "Reconnect TikTok and allow video uploads");
      if (code === "spam_risk_too_many_pending_share" || code === "spam_risk_user_banned_from_posting") throw new HttpError(429, "TikTok is rate-limiting uploads for this account — finish posting your pending drafts first");
      throw new HttpError(502, `TikTok rejected the upload: ${j?.error?.message || code}`);
    }

    const fd = fs.openSync(file, "r");
    try {
      for (let i = 0; i < count; i++) {
        const start = i * chunkSize;
        const end = i === count - 1 ? size - 1 : start + chunkSize - 1; // last chunk takes the remainder
        const buf = Buffer.alloc(end - start + 1);
        fs.readSync(fd, buf, 0, buf.length, start);
        const up = await fetch(j.data.upload_url, {
          method: "PUT",
          headers: { "Content-Type": "video/mp4", "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(buf.length) },
          body: new Uint8Array(buf),
        });
        if (!up.ok) throw new HttpError(502, `Upload to TikTok failed on chunk ${i + 1}/${count} (${up.status})`);
      }
    } finally { fs.closeSync(fd); }
    return NextResponse.json({ ok: true, publishId: j.data.publish_id, bytes: size, chunks: count });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
