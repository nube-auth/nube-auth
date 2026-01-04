# @proofa/workers

Background job worker service for Proofa. Handles async processing of payment confirmations, webhook events, and license synchronization.

## Workers

- **PROCESS_PAYMENT** - Confirms payment completion and creates transaction records
- **PROCESS_WEBHOOK** - Handles async webhook event processing from payment providers
- **SYNC_LICENSE** - Synchronizes user licenses after successful purchase (Phase 2)

## Development

```bash
pnpm --filter @proofa/workers dev
```

## Building

```bash
pnpm --filter @proofa/workers build
```

## Architecture

Workers communicate with the core service via dynamic imports to handle payment and webhook processing. All workers use BullMQ for job management with Redis as the message broker.

Queue connections are managed via `@proofa/queue` package.
