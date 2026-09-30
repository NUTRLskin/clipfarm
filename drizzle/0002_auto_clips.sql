ALTER TYPE "public"."job_type" ADD VALUE 'analyze';--> statement-breakpoint
CREATE TABLE "vod_analyses" (
	"vod_id" text PRIMARY KEY NOT NULL,
	"channel_login" text,
	"title" text,
	"status" "asset_status" DEFAULT 'pending' NOT NULL,
	"progress" real DEFAULT 0 NOT NULL,
	"duration" real,
	"thumbs_key" text,
	"wave_key" text,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"moments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error" text,
	"requested_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "project_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "heartbeat_at" timestamp with time zone;