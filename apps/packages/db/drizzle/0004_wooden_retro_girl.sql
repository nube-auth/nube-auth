CREATE TABLE "app_webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"app_id" integer NOT NULL,
	"url" text NOT NULL,
	"secret" text NOT NULL,
	"events" jsonb DEFAULT '[]' NOT NULL,
	"description" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_webhooks_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "outbound_webhook_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"webhook_id" integer NOT NULL,
	"app_id" integer NOT NULL,
	"event" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"response_status" smallint,
	"response_body" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempt" smallint DEFAULT 1 NOT NULL,
	"duration_ms" integer,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "outbound_webhook_logs_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "plans" ALTER COLUMN "features" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "app_webhooks" ADD CONSTRAINT "app_webhooks_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_webhook_logs" ADD CONSTRAINT "outbound_webhook_logs_webhook_id_app_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."app_webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_webhook_logs" ADD CONSTRAINT "outbound_webhook_logs_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_webhooks_app_id_idx" ON "app_webhooks" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "app_webhooks_is_active_idx" ON "app_webhooks" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "outbound_webhook_logs_webhook_id_idx" ON "outbound_webhook_logs" USING btree ("webhook_id");--> statement-breakpoint
CREATE INDEX "outbound_webhook_logs_app_id_idx" ON "outbound_webhook_logs" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "outbound_webhook_logs_event_idx" ON "outbound_webhook_logs" USING btree ("event");--> statement-breakpoint
CREATE INDEX "outbound_webhook_logs_status_idx" ON "outbound_webhook_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "outbound_webhook_logs_created_at_idx" ON "outbound_webhook_logs" USING btree ("created_at");