ALTER TABLE "projects" ALTER COLUMN "campaign_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "twitch_login" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "twitch_display" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "twitch_avatar" text;