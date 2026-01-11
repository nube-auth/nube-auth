# @proofa/shared

Core shared types, utilities, and constants for the Proofa platform.

## Contents

- **Types**: Central type definitions for User, Session, Project, App, License, and Auth
- **ID Generators**: Type-safe ID generation for all entity types
- **Constants**: TTL values, provider names, license plans, and role definitions
- **Utilities**: Common date manipulation utilities

## Installation

```bash
pnpm install @proofa/shared
```

## Usage

### ID Generation

```typescript
import { id } from '@proofa/shared';

// Core entities
const userId = id.user();                    // U0...
const sessionId = id.session();              // S0...
const projectId = id.project();              // P0...
const appId = id.app();                      // A0...

// Billing entities
const planId = id.plan();                    // PL0...
const purchaseId = id.purchase();            // PU0...
const subscriptionId = id.subscription();    // SB0...
const transactionId = id.transaction();      // TX0...

// 23 total entity types with nanoid-based generation
// See PRODUCT_SPEC.md Section 5 for complete list
```

### Types

```typescript
import type { User, Session, Project, License } from '@proofa/shared';
```

### Constants

```typescript
import { 
  CORE_SESSION_TTL_SECONDS,        // 31536000 (365 days users)
  CORE_ADMIN_SESSION_TTL_SECONDS,  // 7200 (2 hours admins)
  GATEWAY_SESSION_DEFAULT_TTL_SECONDS, // 2592000 (30 days)
  PROVIDERS, 
  LICENSE_PLANS 
} from '@proofa/shared';

// All time values are in seconds for consistency
```

### Utilities

```typescript
import { getCurrentEpoch, addDays, isExpired, formatEpoch } from '@proofa/shared';

const now = getCurrentEpoch();
const expiryDate = addDays(30);
const expired = isExpired(expiryDate);
const iso = formatEpoch(expiryDate);
```
