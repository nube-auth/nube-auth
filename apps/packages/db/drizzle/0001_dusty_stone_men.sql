ALTER TABLE "apps" ADD COLUMN "icon" varchar(50) DEFAULT 'application' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "icon" varchar(50) DEFAULT 'folder' NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "country" varchar(2);