import { pgTable, pgEnum, text, timestamp, jsonb, real, integer, boolean, index } from "drizzle-orm/pg-core";
import { createId } from "../id";

export const assetKind = pgEnum("asset_kind", ["vod", "video", "image", "audio", "export"]);
export const assetStatus = pgEnum("asset_status", ["pending", "processing", "ready", "failed"]);
export const jobType = pgEnum("job_type", ["ingest", "probe", "transcribe", "render", "analyze"]);
export const jobStatus = pgEnum("job_status", ["queued", "running", "done", "failed"]);

/** A clipper's editing project — one TikTok video. */
export const projects = pgTable("projects", {
  id: text("id").primaryKey().$defaultFn(createId),
  ownerId: text("owner_id").notNull(),
  ownerName: text("owner_name"),
  /** Optional — set when the clip is for a ClipFarm campaign (needed to submit for payout). */
  campaignId: text("campaign_id"),
  /** Twitch channel the footage comes from (any streamer, not just campaign ones). */
  twitchLogin: text("twitch_login"),
  twitchDisplay: text("twitch_display"),
  twitchAvatar: text("twitch_avatar"),
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
  /** Null for jobs that aren't tied to a project (VOD analysis is shared across clippers). */
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  type: jobType("type").notNull(),
  status: jobStatus("status").notNull().default("queued"),
  progress: real("progress").notNull().default(0),
  payload: jsonb("payload").notNull().default({}),
  result: jsonb("result"),
  error: text("error"),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  /** Bumped by the worker while a job runs; stale-job requeue keys off this, not started_at. */
  heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
}, t => [index("jobs_queue_idx").on(t.status, t.createdAt)]);

/**
 * Highlight analysis of one Twitch VOD — filmstrip, loudness curve and ranked "moments" from
 * Twitch clips, chat velocity and audio spikes. Keyed by VOD id and shared by every clipper.
 */
export const vodAnalyses = pgTable("vod_analyses", {
  vodId: text("vod_id").primaryKey(),
  channelLogin: text("channel_login"),
  title: text("title"),
  status: assetStatus("status").notNull().default("pending"),
  progress: real("progress").notNull().default(0),
  duration: real("duration"),
  /** Sprite sheet across the whole VOD + per-second loudness curve. */
  thumbsKey: text("thumbs_key"),
  waveKey: text("wave_key"),
  /** { thumbs: {cols,rows,interval,tw,th,count}, signals: {clips,chat,audio}: boolean } */
  meta: jsonb("meta").notNull().default({}),
  /** Moment[] — see lib/moments.ts */
  moments: jsonb("moments").notNull().default([]),
  error: text("error"),
  requestedBy: text("requested_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type AssetRow = typeof assets.$inferSelect;
export type JobRow = typeof jobs.$inferSelect;
export type VodAnalysisRow = typeof vodAnalyses.$inferSelect;
