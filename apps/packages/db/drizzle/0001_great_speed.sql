CREATE TABLE "app_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"app_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_users_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "app_users_app_user_unique" UNIQUE("app_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_users_app_id_idx" ON "app_users" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "app_users_user_id_idx" ON "app_users" USING btree ("user_id");