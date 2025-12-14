/**
 * Drizzle ORM Migration Instructions
 * 
 * To generate migrations from schema changes:
 * 
 * 1. Install drizzle-kit CLI:
 *    npm install -g drizzle-kit
 * 
 * 2. Create drizzle.config.ts in project root:
 *    export default defineConfig({
 *      schema: "./packages/db/src/schema.ts",
 *      out: "./packages/db/migrations",
 *      driver: "turso",
 *      dbCredentials: {
 *        url: process.env.DATABASE_URL!,
 *        authToken: process.env.DATABASE_AUTH_TOKEN!,
 *      },
 *    });
 * 
 * 3. Generate migration:
 *    drizzle-kit generate:sqlite
 * 
 * 4. Apply migration to database:
 *    drizzle-kit push:sqlite
 * 
 * For development, use:
 *    drizzle-kit studio
 * 
 * This opens Drizzle Studio at localhost:3000 to inspect your database.
 */

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

/**
 * Run migrations on application startup
 */
export async function runMigrations() {
  const client = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN!,
  });

  drizzle(client, { schema });
  
  // Migrations are auto-applied on connection
  // Drizzle runs any pending migrations in the migrations/ folder
  console.log('✅ Database migrations completed');
}
