import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { signedGetUrl } from "@/lib/storage";
import { requireUser, route, HttpError } from "@/lib/studio";

/** Redirect to the VOD analysis filmstrip or loudness curve (any signed-in clipper). */
export const GET = route(async (req: Request, { params }: { params: Promise<{ vodId: string; variant: string }> }) => {
  await requireUser();
  const { vodId, variant } = await params;
  const [r] = await getDb().select().from(schema.vodAnalyses).where(eq(schema.vodAnalyses.vodId, vodId));
  const key = r ? { thumbs: r.thumbsKey, wave: r.waveKey }[variant] : null;
  if (!key) throw new HttpError(404, "Not found");
  const url = await signedGetUrl(key, 24 * 3600);
  return NextResponse.redirect(new URL(url, req.url), { status: 302, headers: { "Cache-Control": "private, max-age=3600" } });
});
