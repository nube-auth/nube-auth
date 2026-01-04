CREATE TABLE IF NOT EXISTS "licenses_backup" AS SELECT * FROM "licenses";

ALTER TABLE "licenses" 
ADD COLUMN "stripe_customer_id" varchar(255),
ADD COLUMN "stripe_subscription_id" varchar(255);

CREATE INDEX "licenses_stripe_customer_idx" ON "licenses"("stripe_customer_id");
CREATE INDEX "licenses_stripe_subscription_idx" ON "licenses"("stripe_subscription_id");

-- Note: This migration adds Stripe tracking fields to the licenses table
-- to support subscription management. Old licenses without these fields
-- will have NULL values which is acceptable.
