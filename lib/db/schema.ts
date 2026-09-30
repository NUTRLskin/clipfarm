import { pgTable, pgEnum, text, timestamp, jsonb, real, integer, boolean, index } from "drizzle-orm/pg-core";
import { createId } from "../id";

export const assetKind = pgEnum("asset_kind", ["vod", "video", "image", "audio", "export"]);
export const assetStatus = pgEnum("asset_status", ["pending", "processing", "ready", "failed"]);
export const jobType = pgEnum("job_type", ["ingest", "probe", "transcribe", "render"]);
export const jobStatus = pgEnum("job_status", ["queued", "running", "done", "failed"]);

/** A clipper's editing project — one TikTok video. */
export const projects = pgTable("projects", {
  id: text("id").primaryKey().$defaultFn(createId),
  ownerId: text("owner_id").notNull(),
  ownerName: text("owner_name"),
  campaignId: text("campaign_id").notNull(),
  title: text("title").notNull().default("Untitled clip"),
  /** Timeline JSON (lib/editor/types.ts), autosaved by the editor. */
  timeline: jsonb("timeline").notNull(),
  exportAssetId: text("export_asset_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("projects_owner_idx").on(t.ownerId, t.updatedAt)]);

export const assets = pgTable("assets", {
  id: text("id").primaryKey().$defaultFn(createId),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  kind: assetKind("kind").notNull(),
  status: assetStatus("status").notNull().default("pending"),
  name: text("name").notNull(),
  /** Full-quality original (used for final render). */
  key: text("key"),
  /** Low-res, keyframe-dense copy for smooth scrubbing in the editor. */
  proxyKey: text("proxy_key"),
  /** Thumbnail sprite sheet + waveform peaks for the timeline. */
  thumbsKey: text("thumbs_key"),
  waveKey: text("wave_key"),
  duration: real("duration"),
  width: integer("width"),
  height: integer("height"),
  hasAudio: boolean("has_audio").notNull().default(false),
  /** vod: {vodId,vodUrl,start,end}; thumbs: {cols,rows,interval,tw,th}; transcript: {words:[...]} */
  meta: jsonb("meta").notNull().default({}),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("assets_project_idx").on(t.projectId)]);

export const jobs = pgTable("jobs", {
  id: text("id").primaryKey().$defaultFn(createId),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  type: jobType("type").notNull(),
  status: jobStatus("status").notNull().default("queued"),
  progress: real("progress").notNull().default(0),
  payload: jsonb("payload").notNull().default({}),
  result: jsonb("result"),
  error: text("error"),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
}, t => [index("jobs_queue_idx").on(t.status, t.createdAt)]);

export type Project = typeof projects.$inferSelect;
export type AssetRow = typeof assets.$inferSelect;
export type JobRow = typeof jobs.$inferSelect;
