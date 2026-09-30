// Single source of truth for the NextAuth secret, shared by auth.ts and getToken() callers.
if (!process.env.AUTH_SECRET && process.env.NODE_ENV === "production") {
  console.warn("[auth] AUTH_SECRET is not set — sessions are signed with an insecure dev secret. Set it in Railway.");
}
export const AUTH_SECRET = process.env.AUTH_SECRET || "dev-secret-change-in-prod";
