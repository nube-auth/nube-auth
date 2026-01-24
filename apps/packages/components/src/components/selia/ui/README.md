# Selia UI Components

This directory contains Selia UI components installed via `npx selia@latest init`.

**Installation Status**: Placeholder directory created
**Next Step**: Run `npx selia@latest init` to populate components

See: https://github.com/nauvalazhar/selia

## Components Structure

Once Selia is installed, this directory will contain:
- button.tsx
- dialog.tsx
- select.tsx
- input.tsx
- label.tsx
- card.tsx
- alert.tsx
- ... (50+ components)

## Import Pattern

✅ Allowed in @proofa/components wrappers only:
```typescript
import { Button } from '@/components/selia/ui/button';
```

❌ Never in admin pages:
```typescript
import { Button } from '@/components/selia/ui/button'; // WRONG!
```

Use wrappers instead:
```typescript
import { Button } from '@proofa/components';
```
