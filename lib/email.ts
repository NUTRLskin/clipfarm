/**
 * Transactional email (password resets). Sends through Resend when RESEND_API_KEY and EMAIL_FROM
 * are set. Without them, development prints the email to the server log; production logs a warning.
 */
export async function sendEmail(m: { to: string; subject: string; text: string }) {
  const key = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM;
  if (!key || !from) {
    if (process.env.NODE_ENV !== "production") console.log(`[email:dev] to=${m.to}\nsubject: ${m.subject}\n\n${m.text}\n`);
    else console.warn("[email] RESEND_API_KEY / EMAIL_FROM not set — email not sent:", m.subject);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [m.to], subject: m.subject, text: m.text }),
  });
  if (!res.ok) console.error("[email] send failed", res.status, await res.text().catch(() => ""));
}

/**
 * Base URL for links in emails. Taken from config, never from the request's Host header,
 * so a forged Host can't point reset links at someone else's site. Falls back to the request
 * origin only in development.
 */
export function appUrl(req: Request): string {
  const configured = process.env.APP_URL || process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  if (configured) return configured.replace(/\/+$/, "");
  if (process.env.NODE_ENV !== "production") return new URL(req.url).origin;
  throw new Error("Set APP_URL so password reset links point at the right site");
}
