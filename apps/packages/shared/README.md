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

const userId = id.user();
const sessionId = id.session();
const projectId = id.project();
```

### Types

```typescript
import type { User, Session, Project, License } from '@proofa/shared';
```

### Constants

```typescript
import { SESSION_TTL_DAYS, PROVIDERS, LICENSE_PLANS } from '@proofa/shared';
```

### Utilities

```typescript
import { getCurrentEpoch, addDays, isExpired, formatEpoch } from '@proofa/shared';

const now = getCurrentEpoch();
const expiryDate = addDays(30);
const expired = isExpired(expiryDate);
const iso = formatEpoch(expiryDate);
```
