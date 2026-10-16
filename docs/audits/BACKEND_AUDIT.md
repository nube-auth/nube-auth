# Nube Auth backend audit

**Second pass:** 16 October 2026
**Tree:** `trunk` plus uncommitted secret-storage work
**Scope:** Gateway, Core, Workers, packages (`auth`, `db`, `cache`, `queue`, `shared`, `billing`), and deploy config

This file is the source of truth. The first pass closed the items in [Closed in the first pass](#closed-in-the-first-pass). This pass re-read the current tree, including the secret-box changes, and checked the findings below in code.

## Summary

The second-pass findings below were fixed in code on 16 October 2026, except the structural refactors called out at the end. Deploy this branch before the sealed app secrets and webhook signatures work again.

| Severity | Was open | Now |
| --- | --- | --- |
| Critical | 1 | Billing routes are limited to the caller's projects |
| High | 3 | Session binding, Dodo file removed, deploy still required for sealed secrets |
| Medium | 7 | Fixed in code. Existing provider webhook secrets stay readable until they are rewritten after deploy |
| Low | 4 | Fixed |

Structural debt (Gateway database access, the duplicate billing trees, and the size of `auth.ts`) is still open. Subscription lists are batched. The other admin lists are not. Staging's nginx health check stays on `/health` because that process does not serve `/ready`. Production core, gateway, and workers probes use `/ready`.

## Findings addressed in this change

### AUTH-BILL-01 — Critical — Platform billing is not tenant-scoped

`enforceAdminAccess` checks project membership only when the path contains a project, app, or routing-rule id. `/v1/admin/billing/*` has none, so any live admin session is enough.

The billing router then reads and writes across every tenant:

- `GET /billing/stats`, `/purchases`, `/transactions`, `/webhooks`, `/refunds` call the global `findAll` helpers
- `GET /billing/webhooks/:webhookId` returns the stored request body, headers, and signature
- `POST /billing/webhooks/:webhookId/retry` requeues that delivery
- `POST /billing/refunds` creates a refund record for any completed purchase id

Gateway only requires the admin session cookie before it proxies the call. A member of one project can read another project's purchases, payer emails, and payment webhook payloads.

Evidence: `apps/services/core/src/middleware/admin-access.ts` (membership check runs only when a resource id was parsed), `apps/services/core/src/routes/v1/admin/billing.ts`, `apps/services/core/src/routes/v1/admin/index.ts`.

Provider routes are not in this gap. They call `validateProjectAccess` and require the project owner. Routing-rule paths carry a numeric app id, which the middleware does scope.

### OPS-ENC-01 — High — Running services cannot read the sealed secrets

Staging and production databases were rewritten in this session. App client secrets are stored as `clientSecretHash` plus `clientSecretEnc`, and the plaintext field is null. Both webhook signing secrets are `enc1:` envelopes. Each value was opened with that environment's payment key before commit.

The image currently serving traffic still compares the plaintext `clientSecret` and signs webhooks with the stored string. Until this branch is deployed:

- app-secret checks fail
- customer webhook signatures will not match

Workers call `openSecret` only in this tree. The vault entrypoint still does not require `PAYMENT_CONFIGS_KEY` for the workers process (`nube-scripts/deploy/docker/dhd-entrypoint.sh`). A worker that starts without that key fails at delivery time. Production deploy config lists the key, and the vault file contains it.

Gateway auth in this tree compares the hash, so it does not need the key to accept a presented client secret. Reveal and webhook signing do.

### SEC-DODO-01 — High — Dodo test credentials are committed

`apps/services/core/test-dodo.mjs` contains a Dodo test-mode API key and webhook secret. Rotate both in Dodo and delete the file. Do not copy the values into docs or chat.

### AUTH-CORE-01 — High — Core user routes trust the user header

Admin routes now require a live session whose user matches `X-Nube-User-Id`. License validate, activate, deactivate, and `for-user`, subscription cancel and resume, and checkout still take that header after the shared `S2S_SECRET` alone.

Anyone who can call Core with the service token can act as any user: start a checkout, activate a device, or cancel a subscription. Gateway stamps the header from the session for the paths it proxies. Core does not check that stamp.

Evidence: `apps/services/core/src/routes/v1/license/index.ts`, `apps/services/core/src/routes/v1/subscription/index.ts`, `apps/services/core/src/routes/v1/billing/checkout.ts`, `apps/services/core/src/middleware/s2s.ts`.

### SSRF-REBIND-01 — Medium — Webhook DNS is checked, then resolved again

`assertSafeOutboundUrl` resolves the host and rejects private answers. `postOutboundWebhook` then calls `fetch` on the hostname, which resolves a second time. A name that is public at check time and private at connect time is not pinned. Redirects are already refused.

Evidence: `apps/packages/shared/src/outbound-url.ts`.

### AUTH-MEM-01 — Medium — Route checks still see deleted memberships

`findByProjectAndUser` does not filter `deleted_at`. Middleware does. App and member handlers that call the query and take the first row can disagree with the middleware: a removed member can block a re-invite, and a stale owner row can satisfy a local role check.

Evidence: `apps/packages/db/src/queries.ts`, `apps/services/core/src/routes/v1/admin/apps.ts`, `apps/services/core/src/routes/v1/admin/members.ts`.

### SEC-LEGACY-01 — Medium — Plaintext secret fallback is still compiled in

`presentedSecretMatches`, `findByServiceToken`, and `openSecret` still accept a legacy plaintext value. Gateway caches `{ hash, legacy }` for five minutes under `app-client-secret:${appId}`. The databases no longer have those plaintext fields. The fallback is dormant until a plaintext value is written again, or a stale cache entry is still a raw secret string.

Evidence: `apps/packages/db/src/secret-box.ts`, `apps/packages/db/src/queries.ts`, `apps/services/gateway/src/index.ts`, `apps/services/gateway/src/middleware/appSecret.ts`.

### SEED-01 — Medium — Seed script writes the old secret shape

`apps/packages/db/scripts/seed-project-app.ts` writes `client_secret` and `service_token` and prints a prefix of each. Running it against staging or production would not match the sealed `app_tokens` shape.

### DEBUG-01 — Medium — Debug routes are on whenever production mode is off

`/v1/debug/*` mounts when `NODE_ENV !== "production"` and auth treats that prefix as public. The handlers return cookie names and values. A staging process that is not `NODE_ENV=production` exposes them without a session.

Evidence: `apps/services/gateway/src/index.ts`, `apps/services/gateway/src/routes/debug.ts`, `apps/services/gateway/src/middleware/auth.ts`.

### PAY-WHSEC-01 — Medium — Provider webhook secrets are plaintext

`payment_provider_configs.webhook_secret` is a text column. `GET /providers/:projectId/configs/:providerId/credentials` returns that value, plus decrypted API credentials, to the project owner. App and outbound webhook secrets were sealed. This column was not.

Evidence: `apps/packages/db/src/schema.ts`, `apps/services/core/src/routes/v1/admin/providers.ts`.

### OPS-HEALTH-01 — Medium — Traffic probes still use `/health`

`/ready` returns 503 until the database and Redis are usable. Railway, Fly, and the Docker health checks still request `/health`, which stays HTTP 200 while dependencies are down so a rolling start is not killed. Files: `nube-scripts/deploy/configs/nube-auth.deploy.yml`, `nube-auth.deploy.staging.yml`, `nube-auth.deploy.prod.yml`, `apps/services/gateway/fly.toml`, `apps/services/core/fly.toml`, and the Dockerfiles under `nube-scripts/deploy/docker/`.

Production deploy config also pins services to `feat/envelope-encryption-key-rotation`, not the branch that contains this audit's code.

## Low

- **SSRF-IPV6-01.** `isBlockedIp` blocks loopback, link-local, and `fc`/`fd` unique-local addresses. 6to4 and Teredo literals that embed a private IPv4 address are not decoded.
- **PROMO-01.** Public `validate-promo` forwards a caller-supplied `X-Nube-User-Id`, so redemption state can be queried for another user.
- **SEC-ROTATE-01.** `openSecret` uses `PAYMENT_CONFIGS_KEY` only. Payment-credential decryption also tries `PAYMENT_CONFIGS_KEY_PREVIOUS`. A key rotation would break reveal and webhook signing before it broke payment credentials.
- **TEST-01.** Core has one unit file for origin matching, outbound addresses, and admin path parsing. Workers still run `vitest --passWithNoTests`. Gateway and the packages have no test script. There is no database-backed cross-tenant test.

## Structural debt

These were open in the first pass and are still open.

- **BOUNDARY-01.** Gateway still queries the database from `routes/auth.ts`, `routes/me.ts`, `routes/appCatalog.ts`, `routes/s2s.ts`, `middleware/s2s.ts`, `middleware/appSecret.ts`, `lib/appSecuritySettings.ts`, and `index.ts`. Admin and license reads are proxied to Core.
- **ARCH-01.** `apps/packages/billing` and `apps/services/core/src/billing` are still two trees. Workers import the package. Core enqueues through its own copy. Several files differ.
- **ARCH-02.** `apps/services/gateway/src/routes/auth.ts` is 1342 lines. The largest admin routers are `apps.ts` (994), `test.ts` (909), `promotions.ts` (796), and `webhooks.ts` (673).
- **PERF-01.** Subscription, license, member, plan, routing-rule, billing, and stats lists still query per row. Global licenses were batched.
- **SCHEMA-01.** `AppTokensSchema` in the db and shared packages still describes plaintext `clientSecret` and `serviceToken`. Runtime writes `clientSecretHash`, `clientSecretEnc`, `serviceTokenHash`, and `serviceTokenEnc`.
- **QUEUE-01.** Runtime queue names match `QueueName`. `notifications` and `async-tasks` have no worker. `enqueuePaymentProcessing`, `enqueueLicenseSync`, and `enqueueRefundProcessing` have no callers, and their payloads do not match the workers.

## Closed in the first pass

| Id | What changed |
| --- | --- |
| AUTH-01 | Admin routes require a live session and membership before a project or app id is used. Generic app responses mask secrets. Global licenses are limited to the caller's projects. |
| AUTH-02 | Admin identity is the session user, not a bare `X-Nube-User-Id`. |
| NET-01 | Outbound webhooks require HTTPS outside development, block private and metadata addresses, and do not follow redirects. |
| PAY-01 | Gateway returns 502 when a payment webhook proxy fails. |
| TEST-02 | The payment playground mounts only in development or when `ENABLE_PAYMENT_PLAYGROUND=true`. Global cleanup is disabled. |
| CORS-01 | Origins match an explicit origin or one subdomain under the service domain. |
| LOG-01 | Auth, CSRF, and admin proxy logs no longer include cookies, header maps, or the service token. |
| INPUT-01 | Webhook bodies are capped, headers are allowlisted, endpoints are capped at 25 per app, and delivery concurrency is 5. |
| DEAD-01 | Unused Gateway security and proxy modules were removed. |
| SECRET-01 | New code seals app and webhook secrets. Staging and production rows were rewritten. See OPS-ENC-01 for the deploy gap. |

## Order from here

1. Scope `/v1/admin/billing/*` to the caller's projects, and require owner or admin for refund and retry.
2. Deploy this branch to staging and production so sealed secrets are readable. Flush `app-client-secret:*` in Redis.
3. Rotate the Dodo test key and remove `test-dodo.mjs`. Rotate the database passwords that were pasted into chat.
4. Bind Core license, subscription, and checkout routes to the forwarded session the same way admin routes are bound.
5. Require `PAYMENT_CONFIGS_KEY` in the workers entrypoint, and point load-balancer checks at `/ready` after the deploy.
