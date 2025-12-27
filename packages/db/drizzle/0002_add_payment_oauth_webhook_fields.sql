-- Add payment provider fields to apps table
ALTER TABLE apps ADD COLUMN payment_provider TEXT; -- 'lemonsqueezy' | 'dodo' | 'stripe' | null
ALTER TABLE apps ADD COLUMN payment_test_mode INTEGER DEFAULT 1; -- 1 = test, 0 = live

-- LemonSqueezy fields
ALTER TABLE apps ADD COLUMN lemon_squeezy_store_id TEXT;
ALTER TABLE apps ADD COLUMN lemon_squeezy_api_key TEXT;
ALTER TABLE apps ADD COLUMN lemon_squeezy_webhook_secret TEXT;

-- Dodo Payments fields
ALTER TABLE apps ADD COLUMN dodo_api_key TEXT;
ALTER TABLE apps ADD COLUMN dodo_secret_key TEXT;
ALTER TABLE apps ADD COLUMN dodo_webhook_secret TEXT;

-- Stripe fields (optional, for future)
ALTER TABLE apps ADD COLUMN stripe_publishable_key TEXT;
ALTER TABLE apps ADD COLUMN stripe_secret_key TEXT;
ALTER TABLE apps ADD COLUMN stripe_webhook_secret TEXT;

-- Webhook configuration fields
ALTER TABLE apps ADD COLUMN webhook_url TEXT;
ALTER TABLE apps ADD COLUMN webhook_events TEXT; -- JSON array of events

-- OAuth credentials per app
ALTER TABLE apps ADD COLUMN google_client_id TEXT;
ALTER TABLE apps ADD COLUMN google_client_secret TEXT;
ALTER TABLE apps ADD COLUMN github_client_id TEXT;
ALTER TABLE apps ADD COLUMN github_client_secret TEXT;

-- Create invitations table for smart invite flow
CREATE TABLE invitations (
	id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	public_id TEXT NOT NULL UNIQUE,
	email TEXT NOT NULL,
	app_id INTEGER NOT NULL,
	project_id INTEGER NOT NULL,
	role TEXT, -- 'admin' | 'member' | null (for regular app user)
	license_plan TEXT, -- 'pro' | 'trial' | 'free' | etc.
	license_duration_days INTEGER,
	custom_message TEXT, -- optional welcome message
	expires_at INTEGER NOT NULL, -- invitation expiry timestamp
	created_at INTEGER NOT NULL,
	consumed_at INTEGER, -- when user signed up
	consumed_by_user_id INTEGER,
	FOREIGN KEY (app_id) REFERENCES apps(id),
	FOREIGN KEY (project_id) REFERENCES projects(id),
	FOREIGN KEY (consumed_by_user_id) REFERENCES users(id)
);

-- Indexes for invitations table
CREATE UNIQUE INDEX invitations_email_app_unique ON invitations (email, app_id);
CREATE INDEX invitations_app_id_idx ON invitations (app_id);
CREATE INDEX invitations_project_id_idx ON invitations (project_id);
CREATE INDEX invitations_email_idx ON invitations (email);
CREATE INDEX invitations_expires_at_idx ON invitations (expires_at);
