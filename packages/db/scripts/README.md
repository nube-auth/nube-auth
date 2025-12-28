# Database Scripts

Utility scripts for database management.

## drop-tables.ts

Drops all tables from the database in the correct order (respecting foreign key constraints).

**⚠️ WARNING**: This will delete ALL data in your database!

### Usage

```bash
cd packages/db
pnpm run db:drop
```

### What it does

1. Reads `drizzle/drop_all_tables.sql`
2. Connects to your database using `DATABASE_URL` from `.env`
3. Executes DROP TABLE statements in reverse dependency order
4. Confirms successful completion

### Requirements

- `DATABASE_URL` must be set in your `.env` file at project root
- Database must be accessible

### Safety

- Only use in development environments
- Always backup production data before running
- The script will show you which database it's targeting before execution

## Adding More Scripts

Follow this pattern for new database utility scripts:

```typescript
#!/usr/bin/env node
import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const db = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

// Your script logic here

db.close();
```

Then add to `package.json`:
```json
{
  "scripts": {
    "db:your-script": "tsx scripts/your-script.ts"
  }
}
```
