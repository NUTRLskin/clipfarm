/**
 * Local-disk storage endpoint used when R2 isn't configured (dev). Serves signed GETs with
 * range support and accepts signed PUTs. In production, R2 presigned URLs are used instead.
 */
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { localRoot, verifyLocalSig, r2Configured } from "@/lib/storage";

type Ctx = { params: Promise<{ key: string[] }> };
const TYPES: Record<string, string> = { mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", json: "application/json", mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav", ogg: "audio/ogg" };

function resolve(parts: string[]) {
  const key = parts.map(decodeURIComponent).join("/");
  const file = path.resolve(localRoot(), key);
  if (!file.startsWith(localRoot() + path.sep)) return null;
  return { key, file };
}

export async function GET(req: Request, { params }: Ctx) {
  if (r2Configured()) return new Response("Not found", { status: 404 });
  const r = resolve((await params).key);
  const u = new URL(req.url);
  if (!r || !verifyLocalSig("GET", r.key, u.searchParams.get("exp") || "", u.searchParams.get("sig") || "")) return new Response("Forbidden", { status: 403 });
  if (!fs.existsSync(r.file)) return new Response("Not found", { status: 404 });
  const size = fs.statSync(r.file).size;
  const type = TYPES[path.extname(r.file).slice(1)] || "application/octet-stream";
  const headers: Record<string, string> = { "Content-Type": type, "Accept-Ranges": "bytes", "Cache-Control": "private, max-age=3600" };
  const dl = u.searchParams.get("dl");
  if (dl) headers["Content-Disposition"] = `attachment; filename="${dl.replace(/"/g, "")}"`;
  const range = req.headers.get("range");
  let start = 0, end = size - 1, status = 200;
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (m) { if (m[1]) start = Number(m[1]); if (m[2]) end = Number(m[2]); else if (!m[1]) start = 0; if (m[1] && !m[2]) end = size - 1; }
    end = Math.min(end, size - 1);
    if (start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    status = 206; headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
  }
  headers["Content-Length"] = String(end - start + 1);
  const stream = Readable.toWeb(fs.createReadStream(r.file, { start, end })) as any;
  return new Response(stream, { status, headers });
}

export async function PUT(req: Request, { params }: Ctx) {
  if (r2Configured()) return new Response("Not found", { status: 404 });
  const r = resolve((await params).key);
  const u = new URL(req.url);
  if (!r || !verifyLocalSig("PUT", r.key, u.searchParams.get("exp") || "", u.searchParams.get("sig") || "")) return new Response("Forbidden", { status: 403 });
  await fs.promises.mkdir(path.dirname(r.file), { recursive: true });
  const buf = Buffer.from(await req.arrayBuffer());
  await fs.promises.writeFile(r.file, buf);
  return new Response(null, { status: 200 });
}
