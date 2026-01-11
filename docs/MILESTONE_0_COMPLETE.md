# Milestone 0 Complete: Payment Provider Routing Infrastructure ✅

**Completion Date**: January 11, 2026  
**Status**: ✅ All tasks complete, migration applied, type errors resolved

---

## What Was Built

### 1. Database Layer
✅ **Migration**: `apps/packages/db/drizzle/0001_add_payment_routing_rules.sql`
- Created `payment_routing_rules` table with full schema
- Indexes for efficient lookups (app_id + priority, provider_config_id)
- Foreign keys to `apps` and `payment_provider_configs` with cascade deletion
- Check constraint on `traffic_percentage` (0-100)

✅ **Schema**: `apps/packages/db/src/schema.ts`
- Added `payment_routing_rules` table definition
- Full TypeScript types with Drizzle ORM
- Properly positioned after existing tables

✅ **Queries**: `apps/packages/db/src/queries.ts`
- `routingRuleQueries.findActiveByAppId()` - Get active rules sorted by priority
- `routingRuleQueries.findByAppId()` - Get all rules (active + inactive)
- `routingRuleQueries.findById()` - Get rule by internal ID
- `routingRuleQueries.findByPublicId()` - Get rule by public ID
- `routingRuleQueries.create()` - Create new routing rule
- `routingRuleQueries.update()` - Update existing rule
- `routingRuleQueries.deactivate()` - Soft delete (set is_active = false)
- `routingRuleQueries.delete()` - Hard delete rule
- `routingRuleQueries.hasActiveRules()` - Check if app has any active rules

✅ **Exports**: `apps/packages/db/src/index.ts`
- Exported `routingRuleQueries` for use in services

---

### 2. Provider Selection Service
✅ **File**: `apps/services/core/src/billing/services/provider-selector.ts` (NEW)

**Features**:
- `selectProvider(appId, context)` - Main selection function
- Priority-based rule evaluation (lower priority number = higher precedence)
- Flexible condition matching:
  - `eq` - Exact equality
  - `in` - Value in array
  - `gte` - Greater than or equal
  - `lte` - Less than or equal
  - `ne` - Not equal
- A/B testing support via `traffic_percentage` with consistent hashing
- Catch-all rule support (empty conditions = matches everything)
- `createDefaultRoutingRule()` helper for simple setup

**Selection Context**:
```typescript
{
  country?: string;      // User's country (US, GB, etc.)
  currency?: string;     // Plan currency (usd, eur, etc.)
  amountCents?: number;  // Transaction amount
  paymentMethod?: string; // card, bank_transfer, etc.
  userSegment?: string;  // free, pro, enterprise, etc.
  userId?: string;       // For consistent A/B testing
  planSlug?: string;     // Plan identifier
}
```

**Example Usage**:
```typescript
import { selectProvider } from '../billing/services/provider-selector';

const provider = await selectProvider(appId, {
  country: 'US',
  currency: 'usd',
  amountCents: 9900,
});
```

---

### 3. Admin API Endpoints
✅ **File**: `apps/services/core/src/routes/v1/admin/routing-rules.ts` (NEW)

**Endpoints**:

#### `GET /v1/admin/routing-rules/:appId`
List all routing rules for an app (ordered by priority)
- Returns enriched data with provider info
- Includes active and inactive rules

#### `POST /v1/admin/routing-rules/:appId`
Create new routing rule
- Validates provider config exists
- Supports all condition matchers
- A/B testing via traffic_percentage

#### `PUT /v1/admin/routing-rules/:appId/:ruleId`
Update existing routing rule
- Partial updates supported
- Validates app ownership
- Validates provider config if changing

#### `DELETE /v1/admin/routing-rules/:appId/:ruleId`
Delete routing rule
- Hard delete from database
- Validates app ownership

#### `POST /v1/admin/routing-rules/:appId/test`
Test provider selection with given context
- Dry-run provider selection
- Returns which provider would be selected
- Useful for debugging routing rules

**Registration**: Endpoints registered in `apps/services/core/src/routes/v1/admin/index.ts`

---

### 4. Integration with Existing Code
✅ **Provider Creation**: `apps/services/core/src/routes/v1/admin/providers.ts`
- Added TODO comment for auto-creating routing rules
- Future: Auto-create default catch-all rule when provider is added

---

## Architecture Decisions

### 1. Routing-First Approach
✅ **Decision**: Payment routing rules as PRIMARY provider selection mechanism
- `apps.selected_payment_provider_id` deprecated
- All checkout code will use routing service
- Consistent code path for simple and complex scenarios

### 2. Simple Default, Complex When Needed
✅ **Simple Setup**: One catch-all rule (empty conditions)
```json
{
  "priority": 100,
  "conditions": {},
  "provider_config_id": 123
}
```
Result: Works like "selected provider" - always routes to this provider

✅ **Advanced Setup**: Multiple rules with conditions
```json
[
  {
    "priority": 10,
    "conditions": {
      "country": { "in": ["US", "CA"] }
    },
    "provider_config_id": 456
  },
  {
    "priority": 100,
    "conditions": {},
    "provider_config_id": 123
  }
]
```
Result: US/CA → provider 456, everything else → provider 123

### 3. A/B Testing Built-In
✅ **traffic_percentage** field enables A/B testing:
```json
{
  "priority": 10,
  "conditions": { "country": { "eq": "US" } },
  "traffic_percentage": 50,
  "provider_config_id": 789
}
```
Result: 50% of US traffic goes to provider 789, rest continues to next rule

Uses consistent hashing based on `userId` for stable assignment.

---

## Example Routing Scenarios

### Scenario 1: Geographic Routing
**Use Case**: Use Stripe in US, LemonSqueezy in Europe

**Rules**:
```json
[
  {
    "name": "US/Canada - Stripe",
    "priority": 10,
    "conditions": {
      "country": { "in": ["US", "CA"] }
    },
    "provider_config_id": <stripe_id>
  },
  {
    "name": "Europe - LemonSqueezy",
    "priority": 20,
    "conditions": {
      "country": { "in": ["GB", "DE", "FR", "ES", "IT"] }
    },
    "provider_config_id": <lemon_id>
  },
  {
    "name": "Rest of World - Stripe",
    "priority": 100,
    "conditions": {},
    "provider_config_id": <stripe_id>
  }
]
```

### Scenario 2: Amount-Based Routing
**Use Case**: Small transactions → cheaper provider, large → Stripe

**Rules**:
```json
[
  {
    "name": "Small transactions",
    "priority": 10,
    "conditions": {
      "amountCents": { "lte": 1000 }
    },
    "provider_config_id": <lemon_id>
  },
  {
    "name": "Large transactions",
    "priority": 100,
    "conditions": {},
    "provider_config_id": <stripe_id>
  }
]
```

### Scenario 3: Gradual Rollout (A/B Testing)
**Use Case**: Test new provider with 10% of traffic

**Rules**:
```json
[
  {
    "name": "Canary - New Provider",
    "priority": 10,
    "traffic_percentage": 10,
    "conditions": {},
    "provider_config_id": <new_provider_id>
  },
  {
    "name": "Default - Existing Provider",
    "priority": 100,
    "conditions": {},
    "provider_config_id": <existing_id>
  }
]
```

---

## Files Created

1. ✅ `apps/packages/db/drizzle/0001_add_payment_routing_rules.sql`
2. ✅ `apps/services/core/src/billing/services/provider-selector.ts`
3. ✅ `apps/services/core/src/routes/v1/admin/routing-rules.ts`

## Files Modified

1. ✅ `apps/packages/db/src/schema.ts` - Added `payment_routing_rules` table
2. ✅ `apps/packages/db/src/queries.ts` - Added `routingRuleQueries`
3. ✅ `apps/packages/db/src/index.ts` - Exported `routingRuleQueries`
4. ✅ `apps/services/core/src/routes/v1/admin/index.ts` - Registered routing rules router
5. ✅ `apps/services/core/src/routes/v1/admin/providers.ts` - Added TODO for auto-rule creation
6. ✅ `docs/PAYMENT_INTEGRATION_TODO.md` - Updated to mark Milestone 0 complete

---

## Database Schema

```sql
CREATE TABLE "payment_routing_rules" (
  "id" serial PRIMARY KEY NOT NULL,
  "public_id" varchar(255) NOT NULL UNIQUE,
  "app_id" integer NOT NULL REFERENCES "apps"("id") ON DELETE cascade,
  "priority" integer DEFAULT 100 NOT NULL,
  "conditions" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "provider_config_id" integer NOT NULL REFERENCES "payment_provider_configs"("id") ON DELETE cascade,
  "traffic_percentage" integer DEFAULT 100 NOT NULL CHECK (traffic_percentage >= 0 AND traffic_percentage <= 100),
  "name" varchar(255),
  "description" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX idx_routing_rules_app_priority ON payment_routing_rules(app_id, priority) WHERE is_active = true;
CREATE INDEX idx_routing_rules_provider ON payment_routing_rules(provider_config_id);
CREATE INDEX idx_routing_rules_app_id ON payment_routing_rules(app_id);
```

---

## TypeScript Types

```typescript
interface RoutingRule {
  id: number;                    // Internal ID
  public_id: string;             // Public ID (exposed in API)
  app_id: number;                // Which app this rule belongs to
  priority: number;              // Lower = higher precedence (10-1000)
  conditions: Record<string, {   // Empty {} = catch-all
    eq?: string | number;
    in?: (string | number)[];
    gte?: number;
    lte?: number;
    ne?: string | number;
  }>;
  provider_config_id: number;    // Which provider to route to
  traffic_percentage: number;    // 0-100 for A/B testing
  name?: string | null;
  description?: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

---

## Testing the Implementation

### 1. Create a Provider Config
```bash
curl -X POST http://localhost:3001/v1/admin/providers/:projectId/configs \
  -H "Content-Type: application/json" \
  -H "X-User-Id: USER0..." \
  -d '{
    "provider": "stripe",
    "environment": "test",
    "credentials": {
      "api_key": "sk_test_..."
    },
    "webhookSecret": "whsec_..."
  }'
```

### 2. Create a Routing Rule
```bash
curl -X POST http://localhost:3001/v1/admin/routing-rules/:appId \
  -H "Content-Type: application/json" \
  -d '{
    "provider_config_id": 123,
    "priority": 100,
    "conditions": {},
    "name": "Default Provider",
    "traffic_percentage": 100
  }'
```

### 3. Test Provider Selection
```bash
curl -X POST http://localhost:3001/v1/admin/routing-rules/:appId/test \
  -H "Content-Type: application/json" \
  -d '{
    "country": "US",
    "currency": "usd",
    "amountCents": 9900
  }'
```

---

## Next Steps (Milestone 1)

Now that routing infrastructure is complete, proceed to:

**Milestone 1: Stripe Integration**
- [ ] 1.1: Create Stripe provider adapter
- [ ] 1.2: Implement checkout session creation
- [ ] 1.3: Implement webhook signature verification
- [ ] 1.4: Process checkout.session.completed events
- [ ] 1.5: Create purchase and license records
- [ ] 1.6: Update subscription records on renewal
- [ ] 1.7: Handle subscription cancellation
- [ ] 1.8: Handle payment failures
- [ ] 1.9: Test end-to-end Stripe flow

---

## Performance Notes

- **Query Performance**: Rules indexed by `(app_id, priority)` for fast lookups
- **Memory Footprint**: Rules loaded per request (consider caching if > 100 rules per app)
- **A/B Testing**: Consistent hashing ensures stable user experience
- **Atomic Operations**: All updates via atomic JSONB operations (see docs/JSONB.md)

---

## Security Considerations

- ✅ Public IDs used in all API responses
- ✅ Internal IDs used only for database operations
- ✅ Provider credentials never exposed in routing rules
- ✅ App ownership validated before rule creation/modification
- ✅ Sensitive data redacted from logs

---

## Documentation References

- **JSONB Patterns**: `docs/JSONB.md` - Atomic update patterns
- **Architecture**: `docs/ARCHITECTURE.md` - ID management, service communication
- **TODO**: `docs/PAYMENT_INTEGRATION_TODO.md` - Complete implementation roadmap
- **Copilot Instructions**: `.github/copilot-instructions.md` - Development standards

---

**Milestone 0 Status**: ✅ **COMPLETE**  
**Ready for Milestone 1**: ✅ **YES**  
**Total Implementation Time**: ~2 hours

All infrastructure is in place for context-aware payment provider routing. The system is ready for Stripe adapter implementation (Milestone 1).
