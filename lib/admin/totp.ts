import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "crypto";import { AUTH_SECRET } from "../authSecret";

/** Time-based one-time codes (RFC 6238: SHA-1, 30 seconds, 6 digits), as used by Google Authenticator, 1Password, Authy. */
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer) {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string) {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0, value = 0; const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch); bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

/**
 * The secret offered while someone sets up 2FA. Derived, not random, so every QR code shown before they finish
 * is the same one: rescans, retries, a second tab or an earlier scan all still match. A 2FA reset bumps
 * session_version, which gives a new secret.
 */
export const enrollSecret = (staffId: string, sessionVersion: number) =>
  base32Encode(createHmac("sha256", AUTH_SECRET + ":staff-totp-enroll").update(`${staffId}:${sessionVersion}`).digest().subarray(0, 20));

function codeAt(secret: string, step: number) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(step));
  const h = createHmac("sha1", base32Decode(secret)).update(msg).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, "0");
}

/**
 * Check a code, allowing one step of clock drift either way. Returns the matching step, or null.
 * Callers store the step and refuse any step at or before it, so a code can't be used twice.
 */
export function verifyTotp(secret: string, code: string, lastStep = 0, now = Date.now()): number | null {
  const c = String(code || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(c)) return null;
  const step = Math.floor(now / 30_000);
  for (const s of [step - 1, step, step + 1]) if (s > lastStep && codeAt(secret, s) === c) return s;
  return null;
}

export const otpauthUrl = (secret: string, email: string) =>
  `otpauth://totp/${encodeURIComponent("Clip Farm Admin:" + email)}?secret=${secret}&issuer=${encodeURIComponent("Clip Farm Admin")}&algorithm=SHA1&digits=6&period=30`;

const key = () => createHash("sha256").update(AUTH_SECRET + ":staff-totp").digest();

/** Secrets are stored encrypted, so a leaked database alone can't produce codes. */
export function encryptSecret(secret: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(secret, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map(b => b.toString("base64url")).join(".");
}

export function decryptSecret(blob: string) {
  const [iv, tag, enc] = blob.split(".").map(s => Buffer.from(s, "base64url"));
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}

/** Ten one-time recovery codes like "k3f9-x2pq-7hza", shown once. Only hashes are stored. */
export function newRecoveryCodes() {
  const alpha = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 10 }, () => {
    const b = randomBytes(12);
    const s = Array.from(b, x => alpha[x % alpha.length]).join("");
    return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
  });
}
export const hashRecovery = (code: string) => createHash("sha256").update(code.trim().toLowerCase().replace(/[^a-z0-9]/g, "")).digest("hex");
