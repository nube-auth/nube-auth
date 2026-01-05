# @proofa/queue

BullMQ-based background job queue management for Proofa. Provides type-safe, scalable job processing with built-in support for payment processing, webhooks, emails, and notifications.

## Features

- **Type-Safe**: Full TypeScript support with discriminated unions for job types
- **BullMQ Powered**: Redis-backed queue with built-in retry logic and exponential backoff
- **Future-Ready**: Architecture designed for easy RabbitMQ migration
- **Job Categories**: Payment, Webhook, Email, Notification, and Async Task jobs
- **Monitoring**: Built-in health checks, statistics, and event tracking
- **Error Handling**: Configurable retry strategies per job type
- **Bulk Operations**: Support for bulk job addition and management

## Installation

```bash
pnpm add @proofa/queue
```

### Dependencies

- `bullmq`: ^5.8.0
- `ioredis`: ^5.3.2

## Quick Start

### Initialize Queue Manager

```typescript
import { QueueManager } from "@proofa/queue";

const manager = new QueueManager({
  host: "localhost",
  port: 6379,
});

const queueClient = manager.getQueueClient();
const workerClient = manager.getWorkerClient();
```

### Add Jobs

```typescript
import { QueueName, PaymentJobType } from "@proofa/queue";

// Add single job
await queueClient.addJob(QueueName.PAYMENTS, {
  type: PaymentJobType.PROCESS_PAYMENT,
  purchaseId: 123,
  planProviderPriceId: 456,
  providerConfigId: 789,
  timestamp: Date.now(),
});

// Add multiple jobs
await queueClient.addJobs(QueueName.WEBHOOKS, [
  {
    data: {
      type: WebhookJobType.PROCESS_WEBHOOK,
      webhookLogId: 1,
      provider: "stripe",
      eventType: "checkout.session.completed",
      eventId: "evt_123",
      timestamp: Date.now(),
    },
  },
  {
    data: {
      type: WebhookJobType.PROCESS_WEBHOOK,
      webhookLogId: 2,
      provider: "lemonsqueezy",
      eventType: "order.completed",
      eventId: "evt_456",
      timestamp: Date.now(),
    },
  },
]);
```

### Create Workers

```typescript
import { JobUtils, PaymentJobType } from "@proofa/queue";

workerClient.createWorker(
  QueueName.PAYMENTS,
  async (job) => {
    await JobUtils.log(job, "Processing payment...");
    await JobUtils.updateProgress(job, 50);

    try {
      // Process payment logic here
      const result = await processPayment(job.data);

      return JobUtils.success("Payment processed", result);
    } catch (error) {
      return JobUtils.failure(error.message, "Payment processing failed");
    }
  },
  {
    concurrency: 10,
  }
);
```

## Job Types

### Payment Jobs

- **PROCESS_PAYMENT**: Process a purchase transaction
- **RECONCILE_PAYMENT**: Reconcile payment with provider
- **HANDLE_REFUND**: Process refund request
- **SYNC_LICENSE**: Sync license state

### Webhook Jobs

- **PROCESS_WEBHOOK**: Process incoming webhook event
- **RETRY_WEBHOOK**: Retry failed webhook processing

### Email Jobs

- **SEND_EMAIL**: Send individual email
- **SEND_BATCH**: Send batch emails

### Notification Jobs

- **SEND_NOTIFICATION**: Send user notification

### Async Task Jobs

- **GENERATE_REPORT**: Generate async report
- **EXPORT_DATA**: Export data async
- **CLEANUP**: Cleanup old data

## Configuration

### Environment Variables

```
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0
REDIS_USERNAME=default
WORKER_CONCURRENCY=10
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000
```

### Queue Statistics

```typescript
const stats = await queueClient.getQueueStats(QueueName.PAYMENTS);
// {
//   waiting: 10,
//   active: 2,
//   completed: 1000,
//   failed: 5,
//   delayed: 0,
//   paused: 0
// }
```

## Error Handling

Jobs have configurable retry strategies based on type:

- **Payment Jobs**: 10 attempts with exponential backoff (2s initial)
- **Webhook Jobs**: 15 attempts with exponential backoff (1s initial)
- **Email Jobs**: 5 attempts with exponential backoff (5s initial)
- **Notification Jobs**: 3 attempts with fixed backoff (10s)
- **Async Tasks**: 3 attempts with fixed backoff (30s)

## API Reference

### QueueClient

```typescript
// Add single job
addJob<T>(queueName, data, options?)

// Add multiple jobs
addJobs<T>(queueName, jobs)

// Get job by ID
getJob<T>(queueName, jobId)

// Get queue statistics
getQueueStats(queueName)

// Pause queue
pauseQueue(queueName)

// Resume queue
resumeQueue(queueName)

// Clean queue (remove old jobs)
cleanQueue(queueName, options)

// Close specific queue
closeQueue(queueName)

// Close all queues
closeAllQueues()

// Close Redis connection
closeConnection()
```

### WorkerClient

```typescript
// Create worker
createWorker<T>(queueName, processor, options?)

// Get worker instance
getWorker(queueName)

// Close specific worker
closeWorker(queueName)

// Close all workers
closeAllWorkers()

// Close Redis connection
closeConnection()
```

## Job Result Format

```typescript
interface JobResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}
```

## Architecture & Future RabbitMQ Support

The package is designed with adapter pattern in mind:

1. **Current**: BullMQ + Redis
2. **Future**: Swap Redis/BullMQ implementation with RabbitMQ client
3. **Interface**: Public API remains unchanged

Key abstraction points:
- `QueueClient` - Queue operations interface
- `WorkerClient` - Worker operations interface
- Job type definitions - Language-level contract

## Examples

### Payment Processing

```typescript
workerClient.createWorker(
  QueueName.PAYMENTS,
  async (job) => {
    const { purchaseId, planProviderPriceId, providerConfigId } = job.data;

    // 1. Validate purchase
    const purchase = await db.query.purchases.findById(purchaseId);
    if (!purchase) {
      return JobUtils.failure("Purchase not found");
    }

    // 2. Get provider config
    const config = await getProviderConfig(providerConfigId);

    // 3. Process with provider
    const txn = await config.provider.processPayment({
      amount: purchase.amount,
      currency: purchase.currency,
    });

    // 4. Record transaction
    await db.payment_transactions.create({
      purchaseId,
      provider: config.provider,
      providerTransactionId: txn.id,
      amountCents: purchase.amountCents,
      status: "success",
    });

    return JobUtils.success("Payment processed", { transactionId: txn.id });
  }
);
```

### Webhook Processing

```typescript
workerClient.createWorker(
  QueueName.WEBHOOKS,
  async (job) => {
    const { webhookLogId, provider, eventType, eventId } = job.data;

    // 1. Verify signature
    const webhookLog = await db.webhook_logs.findById(webhookLogId);
    const isValid = verifySignature(webhookLog, provider);

    if (!isValid) {
      return JobUtils.failure("Invalid signature");
    }

    // 2. Parse event
    const event = parseWebhookEvent(webhookLog.requestBody, provider);

    // 3. Route to handler
    const handler = getWebhookHandler(provider, eventType);
    const result = await handler(event);

    // 4. Update webhook log
    await db.webhook_logs.update(webhookLogId, {
      status: "completed",
      paymentTransactionId: result.transactionId,
    });

    return JobUtils.success("Webhook processed");
  }
);
```

## License

MIT
