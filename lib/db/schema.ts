import { pgTable, pgEnum, text, timestamp, jsonb, real, integer, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
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

/**
 * Inbox: one thread per (streamer channel, clipper). Threads are keyed by the streamer's Twitch
 * login so a clipper can write before the streamer has ever signed in; the streamer sees it
 * the moment they log in with that Twitch account.
 */
export const threads = pgTable("threads", {
  id: text("id").primaryKey().$defaultFn(createId),
  streamerLogin: text("streamer_login").notNull(),
  streamerDisplay: text("streamer_display"),
  /** Set once the streamer has signed in (their NextAuth user id). */
  streamerUserId: text("streamer_user_id"),
  clipperId: text("clipper_id").notNull(),
  clipperName: text("clipper_name"),
  /** Optional Studio project the conversation is about. */
  projectId: text("project_id"),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
  lastPreview: text("last_preview"),
  unreadForStreamer: integer("unread_for_streamer").notNull().default(0),
  unreadForClipper: integer("unread_for_clipper").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  uniqueIndex("threads_pair_idx").on(t.streamerLogin, t.clipperId),
  index("threads_clipper_idx").on(t.clipperId, t.lastMessageAt),
  index("threads_streamer_idx").on(t.streamerLogin, t.lastMessageAt),
]);

export const messages = pgTable("messages", {
  id: text("id").primaryKey().$defaultFn(createId),
  threadId: text("thread_id").notNull().references(() => threads.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull(),
  senderRole: text("sender_role").notNull(), // "clipper" | "creator"
  senderName: text("sender_name"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("messages_thread_idx").on(t.threadId, t.createdAt)]);

export type Project = typeof projects.$inferSelect;
export type ThreadRow = typeof threads.$inferSelect;
export type MessageRow = typeof messages.$inferSelect;
export type AssetRow = typeof assets.$inferSelect;
export type JobRow = typeof jobs.$inferSelect;
export type VodAnalysisRow = typeof vodAnalyses.$inferSelect;

/**
 * Accounts. One row per person, whichever way they sign in (email + password, Twitch, TikTok).
 * `id` is what every other table calls ownerId / clipperId / streamerUserId, and what the session's
 * user.id carries. Emails are stored lowercased.
 */
export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(createId),
  email: text("email"),
  /** scrypt hash (lib/accounts.ts); null for accounts that only use Twitch/TikTok sign-in. */
  passwordHash: text("password_hash"),
  name: text("name"),
  /** Public handle, lowercase, unique. Set on the profile page. */
  username: text("username"),
  /** Role picked at sign-up; the app shell can still switch between clipper and streamer views. */
  role: text("role").notNull().default("clipper"),
  bio: text("bio"),
  tiktokHandle: text("tiktok_handle"),
  instagramHandle: text("instagram_handle"),
  youtubeHandle: text("youtube_handle"),
  country: text("country"),
  avatarUrl: text("avatar_url"),
  twitchId: text("twitch_id"),
  twitchLogin: text("twitch_login"),
  tiktokOpenId: text("tiktok_open_id"),
  ageConfirmedAt: timestamp("age_confirmed_at", { withTimezone: true }),
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
  /** Version of the terms this user last accepted (lib/terms.ts). Older or null means they must accept again. */
  termsVersion: text("terms_version"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  /** Set by staff to block sign-in and all actions. */
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  /** Bumped on password change/reset; sessions carrying an older number are signed out. */
  sessionVersion: integer("session_version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  uniqueIndex("users_email_idx").on(t.email),
  uniqueIndex("users_username_idx").on(t.username),
  uniqueIndex("users_twitch_idx").on(t.twitchId),
  uniqueIndex("users_tiktok_idx").on(t.tiktokOpenId),
]);

/** One-time password reset links. Only a SHA-256 of the token is stored. */
export const passwordResets = pgTable("password_resets", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** A streamer's paid offer (the UI calls it a contract; older code calls it a campaign). Money is integer cents. */
export const contracts = pgTable("contracts", {
  id: text("id").primaryKey().$defaultFn(createId),
  streamerUserId: text("streamer_user_id").notNull().references(() => users.id),
  streamerName: text("streamer_name").notNull(),
  initials: text("initials").notNull(),
  twitchLogin: text("twitch_login").notNull(),
  budgetCents: integer("budget_cents").notNull(),
  /** Paid to the clipper per 1,000 verified views. Copied from the app-wide rate when the contract goes live, then frozen. */
  rateCents: integer("rate_cents").notNull().default(100),
  targetViews: integer("target_views").notNull().default(0),
  deliveredViews: integer("delivered_views").notNull().default(0),
  spentCents: integer("spent_cents").notNull().default(0),
  clipsAccepted: integer("clips_accepted").notNull().default(0),
  status: text("status").notNull().default("open"), // open | upcoming | closed
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("contracts_streamer_idx").on(t.streamerUserId), index("contracts_status_idx").on(t.status, t.createdAt)]);

/** A clip a clipper submitted to a contract. `earnedCents` is set when the streamer approves it. */
export const clips = pgTable("clips", {
  id: text("id").primaryKey().$defaultFn(createId),
  contractId: text("contract_id").notNull().references(() => contracts.id),
  clipperId: text("clipper_id").notNull().references(() => users.id),
  clipperName: text("clipper_name"),
  title: text("title").notNull().default("Untitled clip"),
  platform: text("platform").notNull().default("tiktok"),
  url: text("url").notNull(),
  tiktokVideoId: text("tiktok_video_id"),
  views: integer("views").notNull().default(0),
  earnedCents: integer("earned_cents").notNull().default(0),
  /** Clip Farm fee taken from the contract budget on top of earnedCents. */
  feeCents: integer("fee_cents").notNull().default(0),
  status: text("status").notNull().default("pending"), // pending | paid | rejected
  coverUrl: text("cover_url"),
  viewsSyncedAt: timestamp("views_synced_at", { withTimezone: true }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: text("reviewed_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  uniqueIndex("clips_video_idx").on(t.tiktokVideoId),
  index("clips_clipper_idx").on(t.clipperId, t.createdAt),
  index("clips_contract_idx").on(t.contractId, t.createdAt),
]);

/** Every time someone accepts the terms: which version, the rate they were shown, when, and from where. Never updated or deleted. */
export const termsAcceptances = pgTable("terms_acceptances", {
  id: text("id").primaryKey().$defaultFn(createId),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  version: text("version").notNull(),
  role: text("role").notNull(),
  rateCents: integer("rate_cents").notNull(),
  feePct: integer("fee_pct").notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("terms_acceptances_user_idx").on(t.userId, t.acceptedAt)]);

/** App-wide settings, one row per key. "rate_cents" is the one rate every new contract uses (Owner-only change). */
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Clip Farm staff. A separate table from users on purpose: a clipper or streamer login can never reach /admin.
 * role: owner | admin | manager | custom (customRoleId). perms holds per-person overrides (lib/admin/perms.ts).
 */
export const staffUsers = pgTable("staff_users", {
  id: text("id").primaryKey().$defaultFn(createId),
  email: text("email").notNull(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"),
  role: text("role").notNull().default("manager"),
  customRoleId: text("custom_role_id"),
  perms: jsonb("perms").notNull().default({}),
  /** TOTP secret, AES-GCM encrypted with AUTH_SECRET. Null until 2FA is set up. */
  totpSecretEnc: text("totp_secret_enc"),
  totpLastStep: integer("totp_last_step").notNull().default(0),
  /** SHA-256 hashes of unused one-time recovery codes. */
  recoveryHashes: jsonb("recovery_hashes").notNull().default([]),
  sessionVersion: integer("session_version").notNull().default(0),
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  invitedBy: text("invited_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [uniqueIndex("staff_users_email_idx").on(t.email)]);

/** A saved set of permission toggles ("Support", "Accountant") given to many staff at once. */
export const staffRoles = pgTable("staff_roles", {
  id: text("id").primaryKey().$defaultFn(createId),
  name: text("name").notNull(),
  perms: jsonb("perms").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One-time links for new staff to set their password and 2FA. Only a SHA-256 of the token is stored. */
export const staffInvites = pgTable("staff_invites", {
  tokenHash: text("token_hash").primaryKey(),
  staffId: text("staff_id").notNull().references(() => staffUsers.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Every staff action. Insert-only. */
export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey().$defaultFn(createId),
  staffId: text("staff_id"),
  staffEmail: text("staff_email"),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  detail: jsonb("detail"),
  ip: text("ip"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("audit_log_created_idx").on(t.createdAt), index("audit_log_target_idx").on(t.targetType, t.targetId)]);

export type StaffRow = typeof staffUsers.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type ContractRow = typeof contracts.$inferSelect;
export type ClipRow = typeof clips.$inferSelect;
