import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { signedGetUrl } from "@/lib/storage";
import { requireUser, route, HttpError } from "@/lib/studio";

/** Redirect to a short-lived signed URL for one of an asset's files (owner only). */
export const GET = route(async (req: Request, { params }: { params: Promise<{ assetId: string; variant: string }> }) => {
  const user = await requireUser();
  const { assetId, variant } = await params;
  const [row] = await getDb().select({ a: schema.assets, ownerId: schema.projects.ownerId }).from(schema.assets)
    .innerJoin(schema.projects, eq(schema.projects.id, schema.assets.projectId)).where(eq(schema.assets.id, assetId));
  if (!row || row.ownerId !== user.id) throw new HttpError(404, "Not found");
  const key = { source: row.a.key, proxy: row.a.proxyKey, thumbs: row.a.thumbsKey, wave: row.a.waveKey }[variant];
  if (!key) throw new HttpError(404, "Not found");
  const dl = new URL(req.url).searchParams.get("dl");
  const url = await signedGetUrl(key, 6 * 3600, dl ? row.a.name.replace(/[^\w.-]+/g, "_") : undefined);
  return NextResponse.redirect(new URL(url, req.url), { status: 302, headers: { "Cache-Control": "private, max-age=3600" } });
});
