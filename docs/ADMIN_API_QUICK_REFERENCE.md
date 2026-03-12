# Admin API Quick Reference Guide

## Services

| Service | Port | Purpose |
|---------|------|---------|
| Gateway | 3004 | Authentication & Routing |
| Core | 3003 | Business Logic |
| Database | 5432 | PostgreSQL |

## Starting Services

```bash
# Individual services
pnpm -F @nube-auth/core dev
pnpm -F @nube-auth/gateway dev
pnpm -F @nube-auth/db dev

# Or use TUI
pnpm dev --ui=tui
```

## Authentication

### Gateway (Port 3004)
- Requires session cookie from login
- Validates user session
- Forwards to Core service

### Core (Port 3003)
- Requires headers for testing:
  - `x-user-id`: Numeric user ID
  - `x-project-id`: Project public ID (for scoped endpoints)

## Testing Endpoints

### List Available Providers
```bash
curl http://localhost:3003/v1/admin/apps/available \
  -H "x-user-id: 1"
```

### Create Payment Provider
```bash
curl -X POST http://localhost:3003/v1/admin/apps/APP_ID/providers \
  -H "Content-Type: application/json" \
  -H "x-user-id: 1" \
  -H "x-project-id: PROJECT_ID" \
  -d '{
    "provider": "stripe",
    "environment": "test",
    "credentials": {
      "apiKey": "sk_test_123",
      "secretKey": "sk_secret_456"
    },
    "webhookSecret": "whsec_789"
  }'
```

### List Providers for App
```bash
curl http://localhost:3003/v1/admin/apps/APP_ID/providers \
  -H "x-user-id: 1" \
  -H "x-project-id: PROJECT_ID"
```

### Update Provider
```bash
curl -X PATCH http://localhost:3003/v1/admin/apps/APP_ID/providers/PROVIDER_ID \
  -H "Content-Type: application/json" \
  -H "x-user-id: 1" \
  -H "x-project-id: PROJECT_ID" \
  -d '{
    "isActive": false,
    "webhookSecret": "new_webhook_secret"
  }'
```

### Set as Default
```bash
curl -X POST http://localhost:3003/v1/admin/apps/APP_ID/providers/PROVIDER_ID/select \
  -H "x-user-id: 1" \
  -H "x-project-id: PROJECT_ID"
```

### Delete Provider
```bash
curl -X DELETE http://localhost:3003/v1/admin/apps/APP_ID/providers/PROVIDER_ID \
  -H "x-user-id: 1" \
  -H "x-project-id: PROJECT_ID"
```

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing user ID) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found (resource doesn't exist) |
| 409 | Conflict (duplicate resource) |
| 500 | Server Error |

## Common Errors

### Missing User ID
```json
{ "error": "Unauthorized" }
```
**Solution:** Add `-H "x-user-id: 1"` header

### Missing Project ID
```json
{ "error": "Project ID required" }
```
**Solution:** Add `-H "x-project-id: PROJECT_ID"` header

### App Not Found
```json
{ "error": "App not found" }
```
**Solution:** Use valid app public ID

### Invalid Provider
```json
{ "error": "Invalid provider. Must be one of: stripe, lemonsqueezy, dodo" }
```
**Solution:** Use supported provider name

### Invalid Environment
```json
{ "error": "Invalid environment. Must be 'test' or 'production'" }
```
**Solution:** Use 'test' or 'production'

### Duplicate Provider
```json
{ "error": "Provider stripe in test environment already configured for this app" }
```
**Solution:** Use different environment or delete existing config

## Endpoint Summary

### Available Providers (No Auth Needed)
```
GET /v1/admin/apps/available
```

### Provider Management (Auth Required)
```
GET    /v1/admin/apps/:appId/providers
GET    /v1/admin/apps/:appId/providers/:providerId
POST   /v1/admin/apps/:appId/providers
PATCH  /v1/admin/apps/:appId/providers/:providerId
DELETE /v1/admin/apps/:appId/providers/:providerId
POST   /v1/admin/apps/:appId/providers/:providerId/select
```

## Database Access

### Query Payment Providers
```typescript
import { getDb, paymentProviderConfigQueries } from "@nube-auth/db";

const db = getDb();

// Get all providers for an app
const providers = await paymentProviderConfigQueries.findByAppId(db, appId);

// Get specific provider
const provider = await paymentProviderConfigQueries.findByPublicId(db, publicId);

// Get default provider
const default = await paymentProviderConfigQueries.findDefaultByApp(db, appId);
```

## File Locations

| File | Purpose |
|------|---------|
| `apps/services/core/src/routes/v1/admin/providers.ts` | Payment provider routes |
| `apps/services/gateway/src/routes/admin.ts` | Gateway proxy |
| `apps/packages/db/src/queries.ts` | Database queries |
| `apps/packages/db/src/schema.ts` | Table definitions |

## Build Commands

```bash
# Build everything
pnpm build

# Build specific service
pnpm build --filter="@nube-auth/core"
pnpm build --filter="@nube-auth/gateway"

# Build with watch
pnpm dev
```

## Common Development Tasks

### Add New Provider Type
1. Update `AVAILABLE_PROVIDERS` in `providers.ts`
2. Update type `PaymentProvider`
3. Update database migrations if needed

### Change Environment Names
1. Update `PAYMENT_ENVIRONMENTS` in `providers.ts`
2. Update type `PaymentEnvironment`

### Add New Credential Field
1. Update request body validation
2. Update response JSON
3. Add to metadata if transient

## Debugging

### Enable Verbose Logging
```bash
DEBUG=* pnpm -F @nube-auth/core dev
DEBUG=admin* pnpm -F @nube-auth/core dev
```

### Check Service Logs
```bash
# Core service
tail -f /tmp/core.log

# Gateway service
tail -f /tmp/gateway.log
```

### Verify Port Binding
```bash
lsof -i :3003  # Core
lsof -i :3004  # Gateway
```

## Performance Tips

- Use provider type filtering in list endpoints
- Cache default provider lookup results
- Use database indexes on (app_id, is_default)
- Limit results when listing many providers

## Security Notes

- Never log credential content
- Credentials should be encrypted before storage
- Webhook secrets should be hashed
- All updates audit-logged
- Project ownership always verified
