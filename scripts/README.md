# Scripts

This directory contains utility scripts for the Proofa project.

## Database Scripts

Database-related scripts are located in `packages/db/scripts/`.

### seed-project-app.ts

Located in: `packages/db/scripts/seed-project-app.ts`

Creates a complete project setup with:
- A demo user (if no users exist)
- A new project for the user
- An app within that project
- A payment provider configuration (Stripe test mode)
- The owner added as a project member

**Usage:**
```bash
pnpm seed:project
```

This script will:
1. Find the first user in the database or create a demo user
2. Create a project for that user
3. Create an app within the project
4. Configure a Stripe test payment provider
5. Display a summary of all created entities

**Requirements:**
- Database must be running and accessible
- DATABASE_URL environment variable must be set

**Output:**
The script will output detailed information about each step and provide a summary at the end with:
- User details
- Project details (ID, public ID, slug)
- App details (ID, public ID, slug, client secret preview, service token preview)
- Payment provider details (ID, public ID, environment)
