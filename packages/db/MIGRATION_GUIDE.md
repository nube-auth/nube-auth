# Database Migration Guide

## Fresh Start (Recommended for Development)

Since you're in early development, you can drop and recreate the database from scratch:

### Option 1: Using Convenient Scripts (Recommended) ⭐

```bash
# Navigate to the db package
cd packages/db

# Install dependencies if needed
pnpm install

# Drop all tables
pnpm run db:drop

# Create fresh tables from schema
pnpm run db:push

# OR do both in one command
pnpm run db:reset
```

### Option 2: Manual SQL Execution

```bash
# Drop all tables
sqlite3 your-database.db < packages/db/drizzle/drop_all_tables.sql

# Create fresh tables
sqlite3 your-database.db < packages/db/drizzle/0000_initial.sql
```

### Option 3: Delete Database File (Nuclear Option)

```bash
# Stop any running services first
# Then delete the database file (adjust path as needed)
rm -f /path/to/your/proofa.db

# Create fresh tables
cd packages/db
pnpm run db:push
```

## What Changed

The fresh migration includes:

✅ **All core tables**: users, identities, sessions, projects, project_members, apps
✅ **Plans table**: For flexible pricing tiers
✅ **Licenses with `plan_id`**: Foreign key to plans (no more hardcoded enums)
✅ **Invitations with `plan_id`**: Foreign key to plans
✅ **Auth tables**: auth_codes, email_verifications
✅ **Audit logs**: For tracking changes

## Important: Create Default Plans

After running migrations, you **must create at least one plan** for each app:

```sql
-- Example: Create a Free plan
INSERT INTO plans (
    public_id, app_id, name, slug, description,
    monthly_price, yearly_price, trial_enabled, trial_days,
    features, status, display_order, created_at, updated_at
) VALUES (
    'PLN0example123', 1, 'Free', 'free', 'Free tier with basic features',
    NULL, NULL, 0, NULL,
    '["Basic features", "Community support"]', 'active', 0,
    strftime('%s', 'now'), strftime('%s', 'now')
);
```

Or use the Admin UI:
1. Go to your app's Licenses page
2. Expand "Pricing Plans" section
3. Click "Create Plan"

## Schema Highlights

### New ID Format
All IDs now use **3-letter prefix + "0" + nanoid**:
- `USR0xY7mK9pQz` (users, 13 chars)
- `PLN0abc123def` (plans, 13 chars)
- `SES0abc123xyz456789` (sessions, 19 chars)

### Foreign Key Relationships
```
licenses.plan_id → plans.id
invitations.plan_id → plans.id
```

This allows:
- ✅ Admins to create custom plans
- ✅ Dynamic plan names and pricing
- ✅ No hardcoded enums
- ✅ Proper referential integrity

## Available Database Scripts

From `packages/db/`, you can run:

```bash
# Drop all tables (DANGER: deletes all data!)
pnpm run db:drop

# Create/update tables from schema
pnpm run db:push

# Drop and recreate (full reset)
pnpm run db:reset

# Open Drizzle Studio (visual DB explorer)
pnpm run db:studio

# Generate migration files from schema changes
pnpm run db:generate
```

## Next Steps

1. ✅ Drop old database (`pnpm run db:drop`)
2. ✅ Run fresh migration (`pnpm run db:push`)
3. ✅ Create default plans for your apps
4. ✅ Test invite flow
5. ✅ Verify licenses are created correctly
