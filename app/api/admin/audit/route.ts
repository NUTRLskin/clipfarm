import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { route } from "@/lib/studio";
import { requireStaff } from "@/lib/admin/session";

/** GET /api/admin/audit — the newest 500 staff actions. Read-only; nothing in the app updates or deletes these rows. */
export const GET = route(async () => {
  await requireStaff("audit");
  const rows = await getDb().select().from(schema.auditLog).orderBy(desc(schema.auditLog.createdAt)).limit(500);
  return NextResponse.json(rows);
});
