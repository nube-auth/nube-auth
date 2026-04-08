# @nube-auth/client

TypeScript/JavaScript client for the [Nube Auth](https://nubeauth.com) API.

## Installation

```bash
npm install @nube-auth/client
# or
pnpm add @nube-auth/client
```

## Quick start

```typescript
import { NubeAuthClient } from '@nube-auth/client';

const client = new NubeAuthClient({
  gatewayUrl: 'https://api.nubeauth.com',
  appId: 'APP0abc123',
});

const user = await client.me.get();
const { hasActivePlan } = await client.subscription.getDetails();
```

## Table of contents

- [Configuration](#configuration)
- [Authentication](#authentication)
- [App OAuth flow](#app-oauth-flow-native-apps--clis)
- [User profile](#user-profile)
- [Sessions](#sessions)
- [License](#license)
- [Subscription](#subscription)
- [App catalog](#app-catalog-server-side)
- [Payment](#payment)
- [Webhooks](#webhooks)
- [Error handling](#error-handling)

---

## Configuration

```typescript
const client = new NubeAuthClient({
  // Required — URL of your Nube Auth gateway
  gatewayUrl: 'https://api.nubeauth.com',

  // Required for license, subscription, and payment APIs
  appId: 'APP0abc123',

  // Web apps: leave undefined — the browser sends cookies automatically.
  // Native apps / CLIs: set after exchanging the OAuth code (see App OAuth below).
  sessionToken: undefined,

  // Server-side apps: your app's client secret (shown once in the dashboard).
  // Enables appCatalog API calls. Never expose in browser code.
  appSecret: process.env.NUBE_APP_SECRET,

  // Service-to-service calls from your own backend.
  s2sToken: process.env.NUBE_S2S_TOKEN,

  // Called when any authenticated request gets a 401 response.
  onSessionExpired: () => { window.location.href = '/login'; },
});
```

---

## Authentication

```typescript
// Check whether a session exists
const { loggedIn, user } = await client.auth.checkStatus();

// Invalidate the current session (clears cookie or Bearer token)
await client.auth.logout();
```

---

## App OAuth flow (native apps / CLIs)

For desktop apps, CLI tools, and browser extensions that cannot use cookies.

```typescript
// 1. Build the OAuth URL with PKCE
const { url, codeVerifier } = await client.app.buildOAuthUrl({
  returnTo: 'myapp://auth',          // custom URL scheme or HTTPS callback
  priceId: 'PRICE0abc123',           // optional: trigger checkout after login
  deviceId: hardwareUuid,            // optional: stable device identifier
});

// Store codeVerifier securely, then open `url` in the system browser
await secureStorage.set('pkce_verifier', codeVerifier);
openBrowser(url);

// 2. After redirect, exchange the one-time code for a session token
const codeVerifier = await secureStorage.get('pkce_verifier');
const { sessionToken, userId } = await client.app.exchangeCode(code, { codeVerifier });

// 3. Create a new client with the session token for all subsequent calls
const authedClient = new NubeAuthClient({
  gatewayUrl: GATEWAY_URL,
  appId: APP_ID,
  sessionToken,
});
```

---

## User profile

```typescript
// Get the current user
const user = await client.me.get();
// { id, email, name, createdAt, avatar_url, emailVerified }

// Update name or avatar
const updated = await client.me.update({ name: 'Alice', avatar_url: 'https://...' });
```

---

## Sessions

```typescript
// List all active sessions for the current user
const { sessions } = await client.sessions.list();
// Each session: { id, createdAt, expiresAt, isCurrent, ipAddress, userAgent, country }

// Revoke a specific session
await client.sessions.delete('SES0abc123');

// Revoke all sessions (full sign out)
await client.sessions.deleteAll();
```

---

## License

Requires `appId` in the client config.

```typescript
// Boolean gate — never throws
const active = await client.license.isActive();

// Full license object
const license = await client.license.getDetails();
// { public_id, app_id, plan, status, valid_from, valid_until, entitlements }
```

---

## Subscription

```typescript
const sub = await client.subscription.getDetails();
// { hasActivePlan, planSlug, status, billingInterval, periodEnd }

await client.subscription.cancel('too_expensive');
await client.subscription.resume();
```

---

## App catalog (server-side)

Fetch your public plan and pricing data. Requires `appId` and `appSecret`.

```typescript
const serverClient = new NubeAuthClient({
  gatewayUrl: process.env.NUBE_GATEWAY_URL!,
  appId: process.env.NUBE_APP_ID!,
  appSecret: process.env.NUBE_APP_SECRET!,
});

// List all active plans
const { plans } = await serverClient.appCatalog.getPlans();
// [{ planId, name, slug, description, features, displayOrder }]

// Prices for a plan
const { prices } = await serverClient.appCatalog.getPrices('PLN0abc123');
// [{ priceId, billingType, interval, amountCents, currency, trialEnabled, trialDays }]
```

---

## Payment

### Create a checkout session

Call this from your **server** (Next.js Server Action, Express route, etc.) — it requires an authenticated user session.

```typescript
const session = await client.payment.createCheckout({
  priceId: 'PRICE0abc123',           // from appCatalog.getPrices()
  userId: 'USER0def456',             // authenticated user's public ID
  customerEmail: 'alice@example.com',
  successUrl: 'https://myapp.com/billing/success',
  cancelUrl: 'https://myapp.com/billing',
  promoCode: 'LAUNCH50',             // optional
  metadata: { referral: 'homepage' }, // optional, forwarded to provider + stored
});

// Redirect the user to complete payment
redirect(session.checkoutUrl);
// session: { checkoutUrl, sessionId, provider, planName, amountCents, interval }
```

### Validate a promo code

Safe to call from the browser — no authentication required. Use it to show a live discount preview.

```typescript
const result = await client.payment.validatePromoCode({
  code: promoInput,
  priceId: 'PRICE0abc123',
});

if (result.valid) {
  console.log(`Discount: ${result.discountCents / 100} — Total: ${result.adjustedTotal / 100}`);
  // result.promotion: { name, discountType, discountValue }
} else {
  console.log(`Invalid: ${result.reason}`);
  // reason: 'code_not_found' | 'promotion_expired' | 'plan_not_eligible' | ...
}
```

---

## Webhooks

### Verify a signature

Every webhook delivery is signed with HMAC-SHA256 using your endpoint's secret. Always verify before processing.

```typescript
import { verifyWebhookSignature } from '@nube-auth/client';

// Express — use express.raw(), NOT express.json()
app.post('/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
  const valid = await verifyWebhookSignature({
    rawBody: req.body,                               // Buffer — before JSON.parse
    signature: req.headers['x-nube-signature'] as string,
    secret: process.env.WEBHOOK_SECRET!,
  });
  if (!valid) return res.sendStatus(401);

  const event = JSON.parse(req.body.toString());
  // handle event ...
  res.sendStatus(200);
});

// Next.js App Router
export async function POST(req: Request) {
  const rawBody = await req.text();
  const valid = await verifyWebhookSignature({
    rawBody,
    signature: req.headers.get('x-nube-signature') ?? '',
    secret: process.env.WEBHOOK_SECRET!,
  });
  if (!valid) return new Response('Unauthorized', { status: 401 });

  const event = JSON.parse(rawBody);
  return new Response(null, { status: 200 });
}
```

`verifyWebhookSignature` uses the Web Crypto API — works in Node.js 18+, Cloudflare Workers, Vercel Edge, Deno, and browsers with no dependencies.

### Event types

Use `WebhookEnvelope<E>` to type incoming payloads. The generic narrows `data` automatically.

```typescript
import type { WebhookEnvelope } from '@nube-auth/client';

function handleWebhook(envelope: WebhookEnvelope) {
  switch (envelope.event) {
    case 'license.upgraded':
      // envelope.data is WebhookLicenseUpgradedData
      console.log(envelope.data.fromPlan, '→', envelope.data.toPlan);
      break;
    case 'user.registered':
      // envelope.data is WebhookUserRegisteredData
      console.log('New user:', envelope.data.email);
      break;
  }
}

// Or type a handler for a single event
type Handler<E extends WebhookEventName> = (e: WebhookEnvelope<E>) => void;
const onCanceled: Handler<'license.canceled'> = (e) => {
  console.log('Ends at:', e.data.endsAt);
};
```

**All 21 supported events:**

| Category | Events |
|----------|--------|
| User | `user.registered` `user.updated` `user.deleted` |
| Session | `session.created` `session.revoked` `session.expired` `session.all_revoked` |
| License | `license.created` `license.upgraded` `license.downgraded` `license.canceled` `license.expired` `license.renewed` `license.reactivated` `license.trial_started` `license.trial_ended` |
| Plan | `plan.created` `plan.updated` `plan.deleted` |
| OAuth | `oauth.connected` `oauth.disconnected` |

---

## Error handling

All API methods throw `NubeAuthError` on failure.

```typescript
import { NubeAuthClient, NubeAuthError } from '@nube-auth/client';

try {
  await client.me.get();
} catch (error) {
  if (error instanceof NubeAuthError) {
    console.error(error.code);    // e.g. 'UNAUTHORIZED'
    console.error(error.status);  // HTTP status code
    console.error(error.message); // human-readable message

    if (error.status === 401) {
      // Redirect to login — or use onSessionExpired in config
    }
  }
}
```
