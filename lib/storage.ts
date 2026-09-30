/**
 * Object storage: Cloudflare R2 (S3 API) in production, local disk in dev.
 * The web app and the worker both use this module; with local storage they
 * must share LOCAL_STORAGE_DIR.
 */
import { createHmac, timingSafeEqual } from "crypto";
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AUTH_SECRET } from "./authSecret";

export const r2Configured = () =>
  !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET);

let _s3: S3Client | null = null;
function s3() {
  if (!_s3) _s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
  });
  return _s3;
}
const bucket = () => process.env.R2_BUCKET!;
export const localRoot = () => path.resolve(process.env.LOCAL_STORAGE_DIR || ".data/storage");
function localPath(key: string) {
  const p = path.resolve(localRoot(), key);
  if (!p.startsWith(localRoot() + path.sep)) throw new Error("bad key");
  return p;
}

export async function putFile(key: string, file: string, contentType: string) {
  if (r2Configured()) {
    await s3().send(new PutObjectCommand({
      Bucket: bucket(), Key: key, Body: fs.createReadStream(file), ContentType: contentType,
      ContentLength: fs.statSync(file).size,
    }));
  } else {
    const dst = localPath(key);
    await fs.promises.mkdir(path.dirname(dst), { recursive: true });
    await fs.promises.copyFile(file, dst);
  }
}

export async function putBuffer(key: string, buf: Buffer | string, contentType: string) {
  if (r2Configured()) {
    await s3().send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: buf, ContentType: contentType }));
  } else {
    const dst = localPath(key);
    await fs.promises.mkdir(path.dirname(dst), { recursive: true });
    await fs.promises.writeFile(dst, buf);
  }
}

export async function getToFile(key: string, file: string) {
  if (r2Configured()) {
    const r = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    await pipeline(r.Body as any, fs.createWriteStream(file));
  } else {
    await fs.promises.copyFile(localPath(key), file);
  }
}

export async function getBuffer(key: string): Promise<Buffer> {
  if (r2Configured()) {
    const r = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    return Buffer.from(await (r.Body as any).transformToByteArray());
  }
  return fs.promises.readFile(localPath(key));
}

export async function removeObject(key: string) {
  if (r2Configured()) await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
  else await fs.promises.rm(localPath(key), { force: true });
}

// ── Signed URLs ───────────────────────────────────────────────────────────
function sign(s: string) { return createHmac("sha256", AUTH_SECRET).update(s).digest("base64url"); }
export function verifyLocalSig(method: string, key: string, exp: string, sig: string) {
  if (Number(exp) < Date.now() / 1000) return false;
  const a = Buffer.from(sign(`${method}:${key}:${exp}`)); const b = Buffer.from(sig || "");
  return a.length === b.length && timingSafeEqual(a, b);
}
function localUrl(method: string, key: string, ttl: number) {
  const exp = String(Math.floor(Date.now() / 1000) + ttl);
  return `/api/storage/${key.split("/").map(encodeURIComponent).join("/")}?exp=${exp}&sig=${sign(`${method}:${key}:${exp}`)}`;
}

/** Short-lived URL the browser can GET (supports range requests). */
export async function signedGetUrl(key: string, ttl = 6 * 3600, downloadName?: string) {
  if (r2Configured()) {
    return getSignedUrl(s3(), new GetObjectCommand({
      Bucket: bucket(), Key: key,
      ResponseContentDisposition: downloadName ? `attachment; filename="${downloadName.replace(/"/g, "")}"` : undefined,
    }), { expiresIn: ttl });
  }
  return localUrl("GET", key, ttl) + (downloadName ? `&dl=${encodeURIComponent(downloadName)}` : "");
}

/** URL the browser can PUT a file to directly (uploads bypass our server). */
export async function presignPut(key: string, contentType: string, ttl = 3600) {
  if (r2Configured()) {
    return getSignedUrl(s3(), new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }), { expiresIn: ttl });
  }
  return localUrl("PUT", key, ttl);
}
