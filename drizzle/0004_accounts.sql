CREATE TABLE "clips" (
	"id" text PRIMARY KEY NOT NULL,
	"contract_id" text NOT NULL,
	"clipper_id" text NOT NULL,
	"clipper_name" text,
	"title" text DEFAULT 'Untitled clip' NOT NULL,
	"platform" text DEFAULT 'tiktok' NOT NULL,
	"url" text NOT NULL,
	"tiktok_video_id" text,
	"views" integer DEFAULT 0 NOT NULL,
	"earned_cents" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"cover_url" text,
	"views_synced_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" text PRIMARY KEY NOT NULL,
	"streamer_user_id" text NOT NULL,
	"streamer_name" text NOT NULL,
	"initials" text NOT NULL,
	"twitch_login" text NOT NULL,
	"budget_cents" integer NOT NULL,
	"rate_cents" integer DEFAULT 50 NOT NULL,
	"target_views" integer DEFAULT 0 NOT NULL,
	"delivered_views" integer DEFAULT 0 NOT NULL,
	"spent_cents" integer DEFAULT 0 NOT NULL,
	"clips_accepted" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"password_hash" text,
	"name" text,
	"username" text,
	"role" text DEFAULT 'clipper' NOT NULL,
	"bio" text,
	"tiktok_handle" text,
	"instagram_handle" text,
	"youtube_handle" text,
	"country" text,
	"avatar_url" text,
	"twitch_id" text,
	"twitch_login" text,
	"tiktok_open_id" text,
	"age_confirmed_at" timestamp with time zone,
	"terms_accepted_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clips" ADD CONSTRAINT "clips_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clips" ADD CONSTRAINT "clips_clipper_id_users_id_fk" FOREIGN KEY ("clipper_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_streamer_user_id_users_id_fk" FOREIGN KEY ("streamer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "clips_video_idx" ON "clips" USING btree ("tiktok_video_id");--> statement-breakpoint
CREATE INDEX "clips_clipper_idx" ON "clips" USING btree ("clipper_id","created_at");--> statement-breakpoint
CREATE INDEX "clips_contract_idx" ON "clips" USING btree ("contract_id","created_at");--> statement-breakpoint
CREATE INDEX "contracts_streamer_idx" ON "contracts" USING btree ("streamer_user_id");--> statement-breakpoint
CREATE INDEX "contracts_status_idx" ON "contracts" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_idx" ON "users" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "users_twitch_idx" ON "users" USING btree ("twitch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_tiktok_idx" ON "users" USING btree ("tiktok_open_id");--> statement-breakpoint
-- Supabase exposes the public schema through its Data API. Turning on row level security with no
-- policies blocks that API from every table; the app connects as the table owner, which bypasses RLS.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "password_resets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "contracts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clips" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "assets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "vod_analyses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "threads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
