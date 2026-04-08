---
title: Webhooks
description: Receive real-time event notifications from Nube Auth in your application
---

Nube Auth sends HTTP `POST` requests to your registered endpoint whenever a notable event occurs — a user registers, a license changes, a session is revoked, etc. Use webhooks to keep your backend in sync without polling.

## How It Works

1. Register a webhook endpoint URL in your app's settings (Admin Dashboard → App → Webhooks)
2. Nube Auth sends a signed `POST` request to your URL whenever a matching event fires
3. Your server verifies the signature, processes the payload, and returns `2xx`
4. Failed deliveries are retried with exponential backoff

## Payload Structure

Every webhook delivery shares the same envelope:

```typescript
interface WebhookPayload {
  /** Unique delivery ID — use for idempotency */
  id: string;
  /** ISO 8601 timestamp of when the event occurred */
  timestamp: string;
  /** Dot-separated event name, e.g. "user.registered" */
  event: string;
  /** Your app's public ID */
  appId: string;
  /** Event-specific data */
  data: Record<string, unknown>;
}
```

Example:

```json
{
  "id": "evt_01HZ2A9X3P",
  "timestamp": "2026-04-08T14:32:00.000Z",
  "event": "user.registered",
  "appId": "APP0abc123",
  "data": {
    "userId": "USER0xyz789",
    "email": "alice@example.com",
    "provider": "google",
    "createdAt": "2026-04-08T14:32:00.000Z"
  }
}
```

## Request Headers

Every webhook delivery includes these headers:

| Header | Description |
|--------|-------------|
| `Content-Type` | `application/json` |
| `X-Nube-Signature` | `sha256=<hmac-sha256-hex>` — HMAC-SHA256 of the raw body |
| `X-Nube-Event` | The event name, e.g. `user.registered` |
| `X-Nube-Delivery` | Unique UUID for this specific delivery attempt |

## Verifying Signatures

Every request includes an `X-Nube-Signature` header in the format `sha256=<hex>` — a HMAC-SHA256 hex digest of the raw request body signed with your webhook secret.

**Always verify the signature before processing.**

```typescript
import { createHmac, timingSafeEqual } from 'crypto';

function verifyWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string,
  secret: string,
): boolean {
  // Strip the "sha256=" prefix
  const signature = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice(7)
    : signatureHeader;

  const expected = createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const sig = Buffer.from(signature, 'hex');
  const exp = Buffer.from(expected, 'hex');

  if (sig.length !== exp.length) return false;
  return timingSafeEqual(sig, exp);
}

// Express example
app.post('/webhooks/nube-auth', express.raw({ type: 'application/json' }), (req, res) => {
  const signatureHeader = req.headers['x-nube-signature'] as string;

  if (!verifyWebhookSignature(req.body, signatureHeader, process.env.NUBE_WEBHOOK_SECRET!)) {
    return res.status(401).send('Invalid signature');
  }

  const payload = JSON.parse(req.body.toString());
  // handle payload.event ...

  res.status(200).send('OK');
});
```

> **Important:** Use `express.raw()` (or equivalent), not `express.json()`, so you receive the raw bytes for signature verification.

## Responding to Webhooks

- Return **`2xx`** to acknowledge receipt. Any response body is ignored.
- Return **`4xx`** or **`5xx`** (or no response / timeout) and Nube Auth will retry.
- Respond within **10 seconds**. Offload heavy processing to a background job.

## Retries

| Attempt | Delay    |
|---------|----------|
| 1       | Immediate|
| 2       | 30 s     |
| 3       | 5 min    |
| 4       | 30 min   |
| 5       | 2 h      |

After 5 failed attempts the delivery is marked `failed` and no further retries are made. Failed deliveries are visible in the **Webhook Monitoring** section of the Admin Dashboard.

## Idempotency

The `id` field in the payload is unique per delivery attempt. The same logical event re-delivered due to retry will carry a new `id`. Use the `data` fields (e.g. `userId`, `licenseId`) to deduplicate if needed.

---

## Event Reference

### User Events

#### `user.registered`
Fires when a new user account is created in your app — via OAuth, magic link, or API.

```json
{
  "event": "user.registered",
  "data": {
    "userId": "USER0abc",
    "email": "alice@example.com",
    "name": "Alice",
    "provider": "google",
    "createdAt": "2026-04-08T14:32:00.000Z"
  }
}
```

---

#### `user.updated`
Fires when a user's profile is updated (name, email, avatar).

```json
{
  "event": "user.updated",
  "data": {
    "userId": "USER0abc",
    "changes": {
      "name": { "from": "Alice", "to": "Alice Smith" }
    },
    "updatedAt": "2026-04-08T15:00:00.000Z"
  }
}
```

---

#### `user.deleted`
Fires when a user account is permanently deleted.

```json
{
  "event": "user.deleted",
  "data": {
    "userId": "USER0abc",
    "email": "alice@example.com",
    "deletedAt": "2026-04-08T16:00:00.000Z"
  }
}
```

---

### Session Events

#### `session.created`
Fires when a user successfully authenticates and a new session is issued.

```json
{
  "event": "session.created",
  "data": {
    "sessionId": "SES0xyz",
    "userId": "USER0abc",
    "provider": "google",
    "ip": "203.0.113.10",
    "userAgent": "Mozilla/5.0 ...",
    "createdAt": "2026-04-08T14:32:00.000Z"
  }
}
```

---

#### `session.revoked`
Fires when a single session is explicitly revoked (user signs out from one device).

```json
{
  "event": "session.revoked",
  "data": {
    "sessionId": "SES0xyz",
    "userId": "USER0abc",
    "revokedBy": "user",
    "revokedAt": "2026-04-08T18:00:00.000Z"
  }
}
```

`revokedBy` is one of `"user"` (voluntary sign-out), `"admin"` (force-revoked), or `"system"` (e.g. password reset).

---

#### `session.expired`
Fires when a session reaches its TTL and is cleaned up.

```json
{
  "event": "session.expired",
  "data": {
    "sessionId": "SES0xyz",
    "userId": "USER0abc",
    "expiredAt": "2026-04-08T22:32:00.000Z"
  }
}
```

---

#### `session.all_revoked`
Fires when all sessions for a user are revoked at once (e.g. "sign out everywhere").

```json
{
  "event": "session.all_revoked",
  "data": {
    "userId": "USER0abc",
    "revokedCount": 3,
    "revokedBy": "user",
    "revokedAt": "2026-04-08T18:10:00.000Z"
  }
}
```

---

### License Events

#### `license.created`
Fires when a user's first license is provisioned (auto-provisioning on registration, manual assignment, or first subscription).

```json
{
  "event": "license.created",
  "data": {
    "licenseId": "LIC0abc",
    "userId": "USER0xyz",
    "planId": "PLN0free",
    "planName": "Free",
    "status": "active",
    "isTrial": false,
    "createdAt": "2026-04-08T14:32:00.000Z"
  }
}
```

---

#### `license.upgraded`
Fires when a user's license moves to a higher plan.

```json
{
  "event": "license.upgraded",
  "data": {
    "licenseId": "LIC0abc",
    "userId": "USER0xyz",
    "previousPlanId": "PLN0free",
    "previousPlanName": "Free",
    "newPlanId": "PLN0pro",
    "newPlanName": "Pro",
    "upgradedAt": "2026-04-08T15:00:00.000Z"
  }
}
```

---

#### `license.downgraded`
Fires when a user's license moves to a lower plan.

```json
{
  "event": "license.downgraded",
  "data": {
    "licenseId": "LIC0abc",
    "userId": "USER0xyz",
    "previousPlanId": "PLN0pro",
    "previousPlanName": "Pro",
    "newPlanId": "PLN0free",
    "newPlanName": "Free",
    "downgradedAt": "2026-04-08T15:00:00.000Z"
  }
}
```

---

#### `license.canceled`
Fires when a subscription is canceled. The license typically remains `active` until period end.

```json
{
  "event": "license.canceled",
  "data": {
    "licenseId": "LIC0abc",
    "userId": "USER0xyz",
    "planId": "PLN0pro",
    "canceledAt": "2026-04-08T16:00:00.000Z",
    "accessEndsAt": "2026-05-01T00:00:00.000Z"
  }
}
```

---

#### `license.expired`
Fires when a license's access period ends.

```json
{
  "event": "license.expired",
  "data": {
    "licenseId": "LIC0abc",
    "userId": "USER0xyz",
    "planId": "PLN0pro",
    "expiredAt": "2026-05-01T00:00:00.000Z"
  }
}
```

---

#### `license.renewed`
Fires when a subscription successfully renews at the end of a billing period.

```json
{
  "event": "license.renewed",
  "data": {
    "licenseId": "LIC0abc",
    "userId": "USER0xyz",
    "planId": "PLN0pro",
    "planName": "Pro",
    "renewedAt": "2026-05-01T00:00:00.000Z",
    "nextRenewalAt": "2026-06-01T00:00:00.000Z"
  }
}
```

---

#### `license.reactivated`
Fires when a previously canceled or expired license is reactivated.

```json
{
  "event": "license.reactivated",
  "data": {
    "licenseId": "LIC0abc",
    "userId": "USER0xyz",
    "planId": "PLN0pro",
    "reactivatedAt": "2026-04-10T10:00:00.000Z"
  }
}
```

---

#### `license.trial_started`
Fires when a user begins a trial period.

```json
{
  "event": "license.trial_started",
  "data": {
    "licenseId": "LIC0abc",
    "userId": "USER0xyz",
    "planId": "PLN0pro",
    "planName": "Pro",
    "trialEndsAt": "2026-04-22T14:32:00.000Z"
  }
}
```

---

#### `license.trial_ended`
Fires when a trial period ends — either converted to paid or expired without conversion.

```json
{
  "event": "license.trial_ended",
  "data": {
    "licenseId": "LIC0abc",
    "userId": "USER0xyz",
    "planId": "PLN0pro",
    "converted": true,
    "endedAt": "2026-04-22T14:32:00.000Z"
  }
}
```

`converted: true` means the user subscribed before the trial expired.

---

### Plan Events

Plan events fire when a plan definition is changed in the Admin Dashboard. Use these to invalidate caches or refresh entitlement data in your app.

#### `plan.created`
Fires when a new plan is created.

```json
{
  "event": "plan.created",
  "data": {
    "planId": "PLN0starter",
    "name": "Starter",
    "isDefault": false,
    "createdAt": "2026-04-08T09:00:00.000Z"
  }
}
```

---

#### `plan.updated`
Fires when a plan's name, entitlements, or settings change.

```json
{
  "event": "plan.updated",
  "data": {
    "planId": "PLN0pro",
    "name": "Pro",
    "changes": {
      "entitlements": {
        "api_calls": { "from": 10000, "to": 50000 },
        "export": { "from": false, "to": true }
      }
    },
    "updatedAt": "2026-04-08T09:30:00.000Z"
  }
}
```

---

#### `plan.deleted`
Fires when a plan is removed.

```json
{
  "event": "plan.deleted",
  "data": {
    "planId": "PLN0starter",
    "name": "Starter",
    "deletedAt": "2026-04-08T10:00:00.000Z"
  }
}
```

---

### OAuth Events

#### `oauth.connected`
Fires when a user links an OAuth provider to their account.

```json
{
  "event": "oauth.connected",
  "data": {
    "userId": "USER0abc",
    "provider": "github",
    "connectedAt": "2026-04-08T14:35:00.000Z"
  }
}
```

---

#### `oauth.disconnected`
Fires when a user unlinks an OAuth provider from their account.

```json
{
  "event": "oauth.disconnected",
  "data": {
    "userId": "USER0abc",
    "provider": "github",
    "disconnectedAt": "2026-04-08T14:40:00.000Z"
  }
}
```

---

## Event Summary

| Event | Trigger |
|-------|---------|
| `user.registered` | New user account created |
| `user.updated` | User profile changed |
| `user.deleted` | User account permanently deleted |
| `session.created` | User successfully authenticated |
| `session.revoked` | Single session revoked |
| `session.expired` | Session TTL reached |
| `session.all_revoked` | All user sessions revoked |
| `license.created` | License first provisioned for a user |
| `license.upgraded` | User moved to a higher plan |
| `license.downgraded` | User moved to a lower plan |
| `license.canceled` | Subscription canceled |
| `license.expired` | License access period ended |
| `license.renewed` | Subscription renewed at billing period end |
| `license.reactivated` | Canceled/expired license reactivated |
| `license.trial_started` | Trial period began |
| `license.trial_ended` | Trial period ended (converted or not) |
| `plan.created` | New plan created in Admin Dashboard |
| `plan.updated` | Plan entitlements or settings changed |
| `plan.deleted` | Plan removed |
| `oauth.connected` | User linked an OAuth provider |
| `oauth.disconnected` | User unlinked an OAuth provider |

---

## Security Best Practices

- **Verify every request** using the `X-Nube-Signature` header before reading the payload.
- **Use `timingSafeEqual`** to compare signatures, never `===`.
- **Use HTTPS** endpoints only. HTTP webhook URLs are rejected.
- **Rotate your webhook secret** periodically from Admin Dashboard → App → Webhooks → Rotate Secret. Allow a short overlap window for in-flight deliveries before deactivating the old secret.
- **Store the secret in an environment variable**, never hardcode it.

## Next Steps

- [Licensing Overview](/licensing/overview/) — configure auto-provisioning and trial settings
- [Plans & Tiers](/licensing/plans/) — define entitlements sent in `plan.updated` events
- [Sessions Overview](/sessions/overview/) — understand session lifecycle
