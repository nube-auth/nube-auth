ALTER TABLE "apps" ADD COLUMN "client_secret_hash" text;--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "client_secret_enc" text;--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "service_token_hash" text;--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "service_token_enc" text;--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "redirect_uris" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "allowed_hosts" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "cors_origins" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "session_ttl_days" smallint DEFAULT 28 NOT NULL;--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "licensing_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "default_plan_id" integer;--> statement-breakpoint
UPDATE "apps" SET
  "client_secret_hash" = "app_tokens"->>'clientSecretHash',
  "client_secret_enc" = "app_tokens"->>'clientSecretEnc',
  "service_token_hash" = NULLIF("app_tokens"->>'serviceTokenHash', ''),
  "service_token_enc" = NULLIF("app_tokens"->>'serviceTokenEnc', ''),
  "redirect_uris" = COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text("security_settings"->'redirectUris') AS value), '{}'::text[]),
  "allowed_hosts" = COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text("security_settings"->'allowedHosts') AS value), '{}'::text[]),
  "cors_origins" = COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text("security_settings"->'corsOrigins') AS value), '{}'::text[]),
  "session_ttl_days" = COALESCE(NULLIF("security_settings"->>'sessionTtlDays', '')::int, 28),
  "licensing_required" = COALESCE(("plan_settings"->>'licensingRequired')::boolean, false);--> statement-breakpoint
UPDATE "apps" AS a SET "default_plan_id" = p.id
FROM "plans" AS p
WHERE a."plan_settings"->>'defaultPlanId' ~ '^[0-9]+$'
  AND p.id = (a."plan_settings"->>'defaultPlanId')::int
  AND p.app_id = a.id;--> statement-breakpoint
UPDATE "apps" AS a SET "default_plan_id" = p.id
FROM "plans" AS p
WHERE a."default_plan_id" IS NULL
  AND COALESCE(a."plan_settings"->>'defaultPlan', '') <> ''
  AND p.app_id = a.id
  AND p.slug = a."plan_settings"->>'defaultPlan';--> statement-breakpoint
UPDATE "apps" AS a SET "default_plan_id" = p.id
FROM "plans" AS p
WHERE a."default_plan_id" IS NULL
  AND a."plan_settings"->>'defaultPlan' = 'free'
  AND p.app_id = a.id
  AND p.slug = 'free-plan';--> statement-breakpoint
ALTER TABLE "apps" ALTER COLUMN "client_secret_hash" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "apps" ALTER COLUMN "client_secret_enc" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "apps" ADD CONSTRAINT "apps_default_plan_id_plans_id_fk" FOREIGN KEY ("default_plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "apps_service_token_hash_idx" ON "apps" USING btree ("service_token_hash");--> statement-breakpoint
CREATE INDEX "apps_default_plan_id_idx" ON "apps" USING btree ("default_plan_id");--> statement-breakpoint
ALTER TABLE "apps" DROP COLUMN "app_tokens";--> statement-breakpoint
ALTER TABLE "apps" DROP COLUMN "security_settings";--> statement-breakpoint
ALTER TABLE "apps" DROP COLUMN "plan_settings";--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "enabled_providers_new" text[] DEFAULT ARRAY['google']::text[] NOT NULL;--> statement-breakpoint
UPDATE "apps" SET "enabled_providers_new" = COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text("enabled_providers") AS value), ARRAY['google']::text[]);--> statement-breakpoint
ALTER TABLE "apps" DROP COLUMN "enabled_providers";--> statement-breakpoint
ALTER TABLE "apps" RENAME COLUMN "enabled_providers_new" TO "enabled_providers";--> statement-breakpoint
ALTER TABLE "app_webhooks" RENAME COLUMN "secret" TO "secret_enc";--> statement-breakpoint
ALTER TABLE "app_webhooks" ADD COLUMN "events_new" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
UPDATE "app_webhooks" SET "events_new" = COALESCE((SELECT array_agg(value) FROM jsonb_array_elements_text("events") AS value), '{}'::text[]);--> statement-breakpoint
ALTER TABLE "app_webhooks" DROP COLUMN "events";--> statement-breakpoint
ALTER TABLE "app_webhooks" RENAME COLUMN "events_new" TO "events";--> statement-breakpoint
ALTER TABLE "payment_provider_configs" RENAME COLUMN "webhook_secret" TO "webhook_secret_enc";--> statement-breakpoint
ALTER TABLE "payment_provider_configs" DROP COLUMN "credentials_dek";