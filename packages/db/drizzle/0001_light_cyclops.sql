ALTER TABLE "apps" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "project_invitations" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "project_members" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "deleted_at" timestamp;