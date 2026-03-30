CREATE TABLE "price_provider_refs" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(255) NOT NULL,
	"price_id" integer NOT NULL,
	"provider_config_id" integer NOT NULL,
	"provider" varchar(50) NOT NULL,
	"external_price_id" varchar(255) NOT NULL,
	"external_product_id" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "price_provider_refs_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "price_provider_refs_unique" UNIQUE("price_id","provider_config_id")
);
--> statement-breakpoint
ALTER TABLE "price_provider_refs" ADD CONSTRAINT "price_provider_refs_price_id_prices_id_fk" FOREIGN KEY ("price_id") REFERENCES "public"."prices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_provider_refs" ADD CONSTRAINT "price_provider_refs_provider_config_id_payment_provider_configs_id_fk" FOREIGN KEY ("provider_config_id") REFERENCES "public"."payment_provider_configs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "price_provider_refs_price_id_idx" ON "price_provider_refs" USING btree ("price_id");--> statement-breakpoint
CREATE INDEX "price_provider_refs_provider_config_id_idx" ON "price_provider_refs" USING btree ("provider_config_id");--> statement-breakpoint
CREATE INDEX "price_provider_refs_external_price_id_idx" ON "price_provider_refs" USING btree ("external_price_id");