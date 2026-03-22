# NubeAuth Integration Guide

This guide covers the canonical integration pattern for `@nube-auth/client` across all client types: **web apps**, **native apps** (macOS, Windows, Linux), **CLI tools**, and **browser extensions**.

---

## Table of Contents

1. [Concepts](#concepts)
2. [Installation](#installation)
3. [Web App Integration (cookie)](#web-app-integration-cookie)
4. [App / CLI Integration (Bearer token)](#app--cli-integration-bearer-token)
5. [Browser Extension Integration](#browser-extension-integration)
6. [Checking Subscription / Plan](#checking-subscription--plan)
7. [Error Handling](#error-handling)
8. [TypeScript Types Reference](#typescript-types-reference)

---

## Concepts

NubeAuth supports two auth modes depending on the client type:

| Mode | Auth delivery | Clients |
|------|---------------|---------|
| **Cookie** | `Set-Cookie` on the OAuth callback | Web browsers, dashboards |
| **Bearer token** | Token returned by `POST /v1/auth/token` after code exchange | Native apps, CLI, browser extensions |

Both modes share the same protected endpoints (`/v1/me`, `/v1/me/subscription`, etc.).
The difference is only in **how you start the OAuth flow** and **how you pass credentials**.

### App OAuth flow (audience=app)

```
1. Build OAuth URL   →  /v1/auth/start?audience=app&app_id=<id>&return_to=<url>
2. Open in browser   →  user signs in via OAuth provider
3. Receive redirect  →  return_to?code=<one-time-code>   (60s TTL, single-use)
4. Exchange code     →  POST /v1/auth/token  { code, app_id }
5. Get sessionToken  →  { sessionToken, userId, appId }
6. Store securely    →  Keychain / credential store / secure storage
7. Use as Bearer     →  Authorization: Bearer <sessionToken>
```

The real `sessionToken` is **never exposed in a URL** — only the short-lived exchange code is. This prevents token leakage in browser history, server logs, and Referer headers.

---

## Installation

```bash
# Inside the NubeAuth monorepo
pnpm add @nube-auth/client --workspace

# External project
npm install @nube-auth/client
```

---

## Web App Integration (cookie)

Web browsers receive a session cookie automatically on the OAuth callback — no manual token handling required.

### Setup

```typescript
// lib/auth.ts
import { NubeAuthClient } from "@nube-auth/client";

export const authClient = new NubeAuthClient({
  gatewayUrl: import.meta.env.VITE_GATEWAY_URL ?? "https://api.nubeauth.com",
  // No sessionToken — browser uses cookies automatically
});
```

### Check authentication

```typescript
const status = await authClient.auth.checkStatus();

if (status.loggedIn) {
  const user = await authClient.me.get();
  console.log(user.name, user.email);
} else {
  window.location.href = "/login";
}
```

### Logout

```typescript
await authClient.auth.logout();
window.location.href = "/login";
```

### With TanStack Query (React)

```typescript
// hooks/useAuth.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth";

export function useAuthStatus() {
  return useQuery({
    queryKey: ["auth-status"],
    queryFn: () => authClient.auth.checkStatus(),
    staleTime: 30_000,
  });
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => authClient.me.get(),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authClient.auth.logout(),
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/login";
    },
  });
}
```

---

## App / CLI Integration (Bearer token)

For native macOS/Windows/Linux apps and CLI tools that can't store cookies.

### Step 1 — OAuth initiation

Use a **bootstrap client** (no session token yet) to build the start URL:

```typescript
// auth/flow.ts
import { NubeAuthClient } from "@nube-auth/client";

const APP_ID = "app_abc123";          // from NubeAuth admin
const GATEWAY_URL = "https://api.nubeauth.com";
const RETURN_TO = "myapp://auth";    // registered custom URL scheme (or https callback)

const bootstrapClient = new NubeAuthClient({ gatewayUrl: GATEWAY_URL });

export function startLogin(deviceId?: string): string {
  return bootstrapClient.app.buildOAuthUrl({
    appId: APP_ID,
    returnTo: RETURN_TO,
    deviceId,                          // optional — hardware UUID for audit logs
  });
  // Returns: https://api.nubeauth.com/v1/auth/start?audience=app&app_id=app_abc123&return_to=myapp://auth
}
```

Open that URL in the system browser / an embedded view. The user signs in with their OAuth provider.

### Step 2 — Code exchange

Your app receives a deep-link or HTTPS callback containing `?code=<one-time-code>`. Extract it and exchange immediately (code expires in 60 seconds):

```typescript
// auth/flow.ts (continued)
import { keychain } from "./keychain";  // your secure storage abstraction

export async function handleCallback(callbackUrl: string): Promise<void> {
  const code = new URL(callbackUrl).searchParams.get("code");
  if (!code) throw new Error("Missing code in callback URL");

  const result = await bootstrapClient.app.exchangeCode(code, APP_ID);
  // result: { sessionToken, userId, appId }

  // Persist the token securely
  await keychain.save("session_token", result.sessionToken);
}
```

### Step 3 — Authenticated client

Create an authenticated client once you have the token:

```typescript
// auth/session.ts
import { NubeAuthClient } from "@nube-auth/client";
import { keychain } from "./keychain";

export async function getAuthedClient(): Promise<NubeAuthClient | null> {
  const sessionToken = await keychain.get("session_token");
  if (!sessionToken) return null;

  return new NubeAuthClient({
    gatewayUrl: GATEWAY_URL,
    appId: APP_ID,
    sessionToken,                      // → Authorization: Bearer <sessionToken>
  });
}
```

### Step 4 — Use the API

```typescript
const client = await getAuthedClient();

if (!client) {
  // Not authenticated — start login flow
  openBrowser(startLogin());
  return;
}

const user = await client.me.get();
const sub  = await client.subscription.getDetails();

if (sub.hasActivePlan) {
  console.log(`Plan: ${sub.planSlug}, expires: ${sub.periodEnd}`);
} else {
  console.log("No active plan — show upgrade prompt");
}
```

### Node.js CLI example

```typescript
// cli/auth.ts
import { NubeAuthClient, NubeAuthError } from "@nube-auth/client";
import { createServer } from "http";
import open from "open";

const APP_ID    = process.env.NUBE_APP_ID!;
const GATEWAY   = process.env.NUBE_GATEWAY_URL!;
const RETURN_TO = "http://localhost:57123/callback";  // local HTTP server

async function login(): Promise<string> {
  const bootstrap = new NubeAuthClient({ gatewayUrl: GATEWAY });
  const oauthUrl  = bootstrap.app.buildOAuthUrl({ appId: APP_ID, returnTo: RETURN_TO });

  // Start a one-shot HTTP server to catch the redirect
  const code = await new Promise<string>((resolve, reject) => {
    const server = createServer((req, res) => {
      const url  = new URL(req.url!, "http://localhost");
      const code = url.searchParams.get("code");
      res.end("<html><body>You can close this tab.</body></html>");
      server.close();
      code ? resolve(code) : reject(new Error("No code"));
    });
    server.listen(57123);
    open(oauthUrl);
  });

  const result = await bootstrap.app.exchangeCode(code, APP_ID);
  return result.sessionToken;
}

// Usage
const token = await login();
const client = new NubeAuthClient({ gatewayUrl: GATEWAY, appId: APP_ID, sessionToken: token });
const user   = await client.me.get();
console.log("Signed in as:", user.name);
```

---

## Browser Extension Integration

Browser extensions cannot rely on cookies from a different origin. Use the Bearer token flow with `chrome.storage.session` (cleared on browser restart) or `chrome.storage.local` (persistent):

```typescript
// background/auth.ts
import { NubeAuthClient } from "@nube-auth/client";

const APP_ID  = "app_ext123";
const GATEWAY = "https://api.nubeauth.com";

// Receive the code from a content script or extension page
chrome.runtime.onMessage.addListener(async (message) => {
  if (message.type === "OAUTH_CODE") {
    const bootstrap = new NubeAuthClient({ gatewayUrl: GATEWAY });
    const result    = await bootstrap.app.exchangeCode(message.code, APP_ID);
    // Store the token — session storage clears on browser restart
    await chrome.storage.session.set({ sessionToken: result.sessionToken });
  }
});

export async function getClient(): Promise<NubeAuthClient | null> {
  const data = await chrome.storage.session.get("sessionToken");
  if (!data["sessionToken"]) return null;
  return new NubeAuthClient({
    gatewayUrl: GATEWAY,
    appId: APP_ID,
    sessionToken: data["sessionToken"] as string,
  });
}
```

---

## Checking Subscription / Plan

`client.subscription.getDetails()` works with **all session types** (cookie or Bearer):

```typescript
const sub = await client.subscription.getDetails();
// Returns: SubscriptionStatus
// {
//   hasActivePlan: boolean,
//   planSlug: string | null,          // e.g. "power", "free"
//   status: string | null,            // "active" | "trialing" | "past_due" | ...
//   billingInterval: string | null,   // "month" | "year"
//   periodEnd: string | null,         // ISO-8601
// }

if (!sub.hasActivePlan) {
  // Show upgrade / paywall UI
}
```

No `appId` is required in config for this call — the session already encodes the app context via the `audience=app` flow.

---

## Error Handling

All methods throw `NubeAuthError` on non-2xx responses:

```typescript
import { NubeAuthError } from "@nube-auth/client";

try {
  const user = await client.me.get();
} catch (err) {
  if (err instanceof NubeAuthError) {
    switch (err.status) {
      case 401:
        // Token expired or revoked — re-authenticate
        await keychain.delete("session_token");
        startLoginFlow();
        break;
      case 429:
        // Rate limited — back off
        break;
      default:
        console.error(`[${err.code}] ${err.message}`);
    }
  }
}
```

---

## TypeScript Types Reference

```typescript
import type {
  NubeAuthClientConfig,  // constructor options
  OAuthStartOptions,     // buildOAuthUrl() argument
  TokenExchangeResult,   // exchangeCode() return value
  SubscriptionStatus,    // subscription.getDetails() return value
  AuthStatus,            // auth.checkStatus() return value
  User,                  // me.get() return value
  Session,               // sessions.list() item
  License,               // license.getDetails() return value
} from "@nube-auth/client";
```

### `NubeAuthClientConfig`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `gatewayUrl` | `string` | ✅ | NubeAuth gateway base URL |
| `appId` | `string` | — | App public ID (required for license queries) |
| `sessionToken` | `string` | — | Bearer token for app/CLI/extension clients |
| `s2sToken` | `string` | — | S2S token for backend-to-backend calls |

### `SubscriptionStatus`

| Field | Type | Description |
|-------|------|-------------|
| `hasActivePlan` | `boolean` | True when active, trialing, or past_due sub exists |
| `planSlug` | `string \| null` | Plan slug (e.g. `"power"`) |
| `status` | `string \| null` | `active \| trialing \| past_due \| canceled \| ...` |
| `billingInterval` | `string \| null` | `"month"` or `"year"` |
| `periodEnd` | `string \| null` | ISO-8601 billing period end |
