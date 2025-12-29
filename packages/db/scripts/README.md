# Database Scripts

Utility scripts for database management.

## drop-tables.ts

Drops all tables from a Postgres schema (uses `CASCADE` to handle foreign key constraints).

**⚠️ WARNING**: This will delete ALL data in your database!

### Usage

```bash
cd packages/db
pnpm run db:drop
```

### What it does

1. Connects to your database using `DATABASE_URL` from `.env`
2. Lists tables in `DATABASE_SCHEMA` (defaults to `public`)
3. Executes `DROP TABLE ... CASCADE` for each table
4. Confirms successful completion

### Requirements

- `DATABASE_URL` must be set in your `.env` file at project root
- Optional: `DATABASE_SCHEMA` (defaults to `public`)
- Database must be accessible

### Safety

- Only use in development environments
- Always backup production data before running
- The script will show you which database it's targeting before execution

## Adding More Scripts

Follow this pattern for new database utility scripts:

```typescript
#!/usr/bin/env node
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: "../../.env" });

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL! });
await client.connect();

// Your script logic here

await client.end();
```

Then add to `package.json`:
```json
{
  "scripts": {
    "db:your-script": "tsx scripts/your-script.ts"
  }
}
```
