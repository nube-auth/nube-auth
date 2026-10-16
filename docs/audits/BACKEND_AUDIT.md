# Nube Auth backend audit

**Date:** 16 October 2026
**Branch audited:** `trunk` at `dc88089`
**Scope:** Gateway, Core, Workers, and backend packages (`auth`, `db`, `cache`, `queue`, `shared`, `billing`), plus deploy/runtime config

This file is the source of truth for the audit. Remediation status is updated as fixes land.

## Summary

| Severity | Open before this change | Addressed here |
| --- | --- | --- |
| Critical | 1 | Authorization gap closed; live credentials removed from generic app responses |
| High | 7 | CORS, session binding, payment acknowledgement, playground guards, secret logging, outbound URL checks, first automated tests |
| Medium | 8 | Queue routing, webhook limits, readiness probes, env fail-fast, dead code |
| Low | 2 | Global license query scoped and batched; unused security modules removed |

## Findings

### AUTH-01 — Critical — Cross-tenant admin access

App-scoped admin routers resolved a project or app id without proving the caller belonged to that project. `GET /projects/:projectId/apps/:appId` returned live `clientSecret` and `serviceToken`. `GET /licenses` listed every tenant.

**Fix:** Core admin routes now require a session-bound user, then check project membership before an app, project, or routing-rule id is used. Generic app responses mask credentials. The existing `/api-keys` route remains the reveal path and still requires an owner or admin. Global licenses are limited to the caller's projects.

### AUTH-02 — High — Caller-controlled admin identity

Core trusted `X-Nube-User-Id` after a shared service token. Gateway already forwards `X-Nube-Session-Id`.

**Fix:** Admin requests must present a live, unrevoked session whose user matches `X-Nube-User-Id`.

### NET-01 — High — Outbound webhook SSRF

Webhook URLs were stored and fetched with no host, scheme, or redirect checks.

**Fix:** Registration, test delivery, and worker delivery reject non-HTTPS URLs outside development, credentials in URLs, loopback, link-local, private, CGNAT, and metadata addresses. Redirects are not followed.

### PAY-01 — High — Payment webhooks acknowledged on failure

Gateway returned HTTP 200 when the Core proxy threw, so providers stopped retrying.

**Fix:** Transport and proxy failures return HTTP 502.

### TEST-02 — High — Payment playground

The test router was mounted in production. Lemon Squeezy and Dodo checks always returned true. A caller could name another project.

**Fix:** The router mounts only in development, or in any environment when `ENABLE_PAYMENT_PLAYGROUND=true`. Non-simulate mode is limited to a Stripe test key. Session and cleanup actions require admin membership on that session's project. Global cleanup is disabled.

### CORS-01 — High — Credentialed CORS suffix match

`https://evil.com` matched the `.com` suffix of `s-api.nubeauth.com`.

**Fix:** Origins are parsed and compared to configured origins or one subdomain under the service's registrable domain. Localhost is development-only.

### LOG-01 — High — Cookies and headers in logs

Auth and CSRF failures logged raw cookies or full header maps. The admin proxy logged the service token.

**Fix:** Those fields are no longer logged. The shared logger redacts common secret paths.

### TEST-01 — High — No backend tests

**Fix:** Unit tests now cover origin matching, blocked outbound addresses, and admin path parsing. Route-level integration tests are still required before `--passWithNoTests` can be removed from Workers.

### QUEUE-01 — Medium — Queue name drift

Payment, license, and refund enqueuers published to `billing`, where the webhook worker ignores unknown job names. Workers listen on `PROCESS_PAYMENT`, `SYNC_LICENSE`, and `PROCESS_REFUND`.

**Fix:** Those enqueuers now publish to the queues the workers consume. Webhooks stay on `billing`. The older `QueueName` enum in `@nube-auth/queue` still uses a third set of names and should be collapsed in a follow-up.

### INPUT-01 — Medium — Unbounded webhooks

**Fix:** Ingress bodies are capped at 256 KiB. Stored headers are allowlisted. Each app can register at most 25 endpoints. Delivery runs five at a time.

### OPS-01 — Medium — Readiness always returned 200

**Fix:** `/live` is liveness and always returns 200 once the process is listening. `/ready` returns 503 until the database and Redis are usable. `/health` still returns 200 so existing Railway and Fly checks keep passing during migration. Point traffic routing at `/ready`.

### CONFIG-01 — Medium — Weak environment parsing

**Fix:** Numeric environment values must be finite integers in range. Production rejects localhost dashboard URLs. OAuth state and email OTP lifetimes use the configured TTLs. Queue Redis configuration fails startup in production and staging when no Redis host is set. The vault entrypoint validates service-specific variables: Core requires `PAYMENT_CONFIGS_KEY`, Gateway requires `GATEWAY_PUBLIC_URL`, and Workers no longer require Gateway or encryption variables.

### PERF-01 — Low — Global license N+1

**Fix:** The global license list loads the caller's apps, licenses, and plans in three queries. Other admin lists still query per row.

### DEAD-01 — Low — Unused security modules

**Fix:** Removed the unmounted admin security check, the unused Gateway `coreService` / `cacheService` pair, and the second Gateway service-token middleware that read a different header.

## Still open

These need a dedicated change and should not be mixed into a silent refactor:

- **SECRET-01.** App service tokens and webhook signing secrets are still stored in plaintext. Hashing or envelope-encrypting them needs a migration that keeps existing tokens valid during rotation.
- **BOUNDARY-01.** Gateway still reads and writes the database for auth, licenses, profile, and catalog flows. Dead proxy helpers are gone; moving the live paths into Core is a separate project.
- **ARCH-01.** `apps/packages/billing` and `apps/services/core/src/billing` are still two trees. Queue routing was aligned in both copies.
- **ARCH-02.** `auth.ts` and the larger admin routers are still monolithic. Tenant authorization now lives in one middleware.
- **Queue enum cleanup.** `QueueName` in `@nube-auth/queue` does not match the runtime queue names.
- **Integration tests.** Cross-tenant HTTP tests need a database harness.

## Remediation order from here

1. Ship the authorization, CORS, webhook, and logging fixes.
2. Add database-backed tests for every admin route that takes an app or project id.
3. Migrate app and webhook secrets to hashes or envelope encryption.
4. Collapse the billing trees and move Gateway domain queries behind Core.
