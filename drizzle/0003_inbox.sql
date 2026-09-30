CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"sender_role" text NOT NULL,
	"sender_name" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "threads" (
	"id" text PRIMARY KEY NOT NULL,
	"streamer_login" text NOT NULL,
	"streamer_display" text,
	"streamer_user_id" text,
	"clipper_id" text NOT NULL,
	"clipper_name" text,
	"project_id" text,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_preview" text,
	"unread_for_streamer" integer DEFAULT 0 NOT NULL,
	"unread_for_clipper" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messages_thread_idx" ON "messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "threads_pair_idx" ON "threads" USING btree ("streamer_login","clipper_id");--> statement-breakpoint
CREATE INDEX "threads_clipper_idx" ON "threads" USING btree ("clipper_id","last_message_at");--> statement-breakpoint
CREATE INDEX "threads_streamer_idx" ON "threads" USING btree ("streamer_login","last_message_at");