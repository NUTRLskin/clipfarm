import { NextResponse } from "next/server";
import { and, eq, desc, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb, schema, dbConfigured } from "./db";
import type { AssetRow, JobRow, Project } from "./db/schema";

export class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }

export function route<T extends any[]>(fn: (...args: T) => Promise<Response>) {
  return async (...args: T) => {
    try {
      if (!dbConfigured()) throw new HttpError(503, "Clipper Studio needs DATABASE_URL (Postgres) configured");
      return await fn(...args);
    } catch (e: any) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      console.error("[studio]", e);
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}

export async function requireUser() {
  const session: any = await auth();
  if (!session?.user?.id) throw new HttpError(401, "Sign in first");
  return session.user as SessionUser;
}
export type SessionUser = { id: string; name?: string; role?: string; twitchLogin?: string; twitchAvatar?: string | null; tiktokConnected?: boolean };

/** Streamer routes: must be signed in with Twitch (or the demo creator) so we know the channel. */
export async function requireStreamer() {
  const u = await requireUser();
  if (!u.twitchLogin) throw new HttpError(403, "Sign in with Twitch to use the streamer dashboard");
  return u as SessionUser & { twitchLogin: string };
}

export async function getOwnedProject(id: string, userId: string): Promise<Project> {
  const [p] = await getDb().select().from(schema.projects).where(and(eq(schema.projects.id, id), eq(schema.projects.ownerId, userId)));
  if (!p) throw new HttpError(404, "Project not found");
  return p;
}

export type AssetView = {
  id: string; kind: AssetRow["kind"]; status: AssetRow["status"]; name: string; duration: number | null;
  width: number | null; height: number | null; hasAudio: boolean; error: string | null;
  src: string | null; proxy: string | null; thumbs: string | null; wave: string | null;
  thumbsInfo: { interval: number; cols: number; rows: number; tw: number; th: number; count: number } | null;
  vod: { vodId: string; start: number; end: number } | null;
  hasTranscript: boolean;
};

const mediaUrl = (a: AssetRow, v: string) => `/api/media/${a.id}/${v}?v=${a.updatedAt.getTime()}`;

export function assetView(a: AssetRow): AssetView {
  const m: any = a.meta || {};
  return {
    id: a.id, kind: a.kind, status: a.status, name: a.name, duration: a.duration, width: a.width, height: a.height,
    hasAudio: a.hasAudio, error: a.error,
    src: a.key ? mediaUrl(a, "source") : null, proxy: a.proxyKey ? mediaUrl(a, "proxy") : null,
    thumbs: a.thumbsKey ? mediaUrl(a, "thumbs") : null, wave: a.waveKey ? mediaUrl(a, "wave") : null,
    thumbsInfo: m.thumbs || null, vod: m.vodId ? { vodId: m.vodId, start: m.start, end: m.end } : null,
    hasTranscript: Array.isArray(m.transcript),
  };
}

export type JobView = Pick<JobRow, "id" | "type" | "status" | "progress" | "error"> & { assetId?: string; createdAt: string };
export const jobView = (j: JobRow): JobView => ({
  id: j.id, type: j.type, status: j.status, progress: j.progress, error: j.error,
  assetId: (j.payload as any)?.assetId || (j.payload as any)?.exportAssetId, createdAt: j.createdAt.toISOString(),
});

export async function projectState(projectId: string) {
  const db = getDb();
  const assets = await db.select().from(schema.assets).where(eq(schema.assets.projectId, projectId)).orderBy(schema.assets.createdAt);
  const jobs = await db.select().from(schema.jobs).where(eq(schema.jobs.projectId, projectId)).orderBy(desc(schema.jobs.createdAt)).limit(30);
  return { assets: assets.map(assetView), jobs: jobs.map(jobView) };
}

export async function assetsByIds(projectId: string, ids: string[]) {
  if (!ids.length) return [];
  return getDb().select().from(schema.assets).where(and(eq(schema.assets.projectId, projectId), inArray(schema.assets.id, ids)));
}

export const MAX_IMPORT_SECONDS = Number(process.env.MAX_IMPORT_SECONDS || 900);
