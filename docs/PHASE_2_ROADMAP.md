# Phase 2 Roadmap - Proofa Platform

## Overview

This document outlines the features and enhancements planned for Phase 2 (post-MVP launch). Phase 1 focused on core authentication, session management, and payment processing. Phase 2 will expand feature coverage with email authentication, activity logging, webhooks, and advanced security features.

**Estimated Timeline**: Q2-Q4 2025

---

## Phase 2 Features (Prioritized)

### 1. Email/Magic Link Authentication (High Priority - 2-3 weeks)

**Objective**: Enable passwordless authentication via email magic links as an alternative to OAuth.

**Endpoints to Implement**:
- `POST /v1/auth/email/request` - Request magic link via email
- `POST /v1/auth/email/verify` - Verify magic link and create session
- `POST /v1/auth/email/resend` - Resend magic link if expired

**Database Changes**:
- `email_authentications` table with code, expires_at, verified_at

**Features**:
- Rate-limited email sending (max 5 per hour per email)
- 15-minute expiration on magic links
- Automatic user creation on first login
- Email verification state tracking

**Implementation Notes**:
- Reuse existing email infrastructure (Resend)
- Add email verification flow to user registration
- Session creation identical to OAuth (use `sessionService.createSession()`)

---

### 2. Activity Logs Viewer (Medium Priority - 2 weeks)

**Objective**: Track and display user activities for security audits and monitoring.

**Endpoints to Implement**:
- `GET /v1/me/activities` - List user's recent activities
- `GET /v1/admin/activities` - Admin view of all activities (paginated)
- `GET /v1/admin/activities/:userId` - Activities for specific user

**Database Changes**:
- `activity_logs` table with:
  - action (login, logout, session_revoked, license_purchased, etc.)
  - resource_type (session, license, app, user)
  - resource_id
  - ip_address
  - user_agent
  - metadata (JSONB)
  - created_at

**Features**:
- Automatic logging of auth events (login, logout, session revocation)
- Payment events logging (checkout, subscription created, canceled)
- User action logging (license updated, settings changed)
- Activity log retention policy (6 months)

**Implementation Notes**:
- Structured logging (already using createLogger)
- Index on user_id and created_at for efficient querying
- Activity export for compliance (CSV/JSON)

---

### 3. Webhook System (Medium Priority - 3 weeks)

**Objective**: Allow apps to subscribe to platform events via webhooks.

**Endpoints to Implement**:
- `POST /v1/me/webhooks` - Create webhook subscription
- `GET /v1/me/webhooks` - List app's webhooks
- `PATCH /v1/me/webhooks/:webhookId` - Update webhook
- `DELETE /v1/me/webhooks/:webhookId` - Delete webhook
- `POST /v1/webhooks/events` - Internal endpoint for webhook dispatch

**Database Changes**:
- `webhooks` table with:
  - app_id
  - event_types (JSONB array: ["user.login", "license.created", etc.])
  - url
  - secret (for HMAC signing)
  - is_active
  - last_triggered_at
  - failure_count

- `webhook_events` table with:
  - webhook_id
  - event_type
  - payload (JSONB)
  - attempt_count
  - last_attempted_at
  - status (pending, delivered, failed)

**Events to Support**:
- `user.authenticated` - User logged in
- `session.revoked` - User session ended
- `license.created` - New license issued
- `license.renewed` - License renewed
- `license.expired` - License expired
- `subscription.canceled` - User canceled subscription

**Implementation Notes**:
- HMAC-SHA256 signing with secret key (include signature in headers)
- Retry mechanism: exponential backoff (1s, 2s, 4s, 8s, 16s max)
- Max 5 retries over 30 minutes
- Webhook delivery via background job (Bull queue on Redis)
- Webhook event history retention: 30 days

---

### 4. Advanced RBAC & Permissions (Low Priority - 3-4 weeks)

**Objective**: Implement fine-grained role-based access control for multi-user projects.

**New Roles**:
- `owner` - Full project access, can invite/remove users, manage billing
- `admin` - Full app access, manage settings, view analytics
- `member` - Standard access, can use app
- `viewer` - Read-only access, cannot modify settings

**Permissions Matrix**:
```
Action               | Owner | Admin | Member | Viewer
---------------------|-------|-------|--------|--------
Create app          | ✓     | ✓     | ✗      | ✗
Update app settings | ✓     | ✓     | ✗      | ✗
View analytics      | ✓     | ✓     | ✓      | ✓
Manage members      | ✓     | ✗     | ✗      | ✗
Manage billing      | ✓     | ✗     | ✗      | ✗
View audit logs     | ✓     | ✓     | ✗      | ✗
```

**Implementation**:
- Add `project_members.permissions` JSONB column for custom permissions
- Middleware to check permissions before route execution
- Admin dashboard UI for permission management

---

## Phase 3 Features (Q1 2025)

### 1. Multi-Factor Authentication (MFA)

**Support for**:
- TOTP (Time-based One-Time Password) via Authenticator apps
- SMS codes (via Twilio)
- Email verification codes

**Endpoints**:
- `POST /v1/auth/mfa/setup` - Enable MFA
- `POST /v1/auth/mfa/verify` - Verify MFA code during login
- `POST /v1/auth/mfa/disable` - Disable MFA

---

### 2. WebAuthn/Passkeys Support

**Features**:
- FIDO2/WebAuthn registration
- Passwordless login with passkeys
- Cross-device authentication

---

## Phase 4 Features (Q2 2025)

### 1. SAML 2.0 / Enterprise SSO

**Features**:
- SAML 2.0 assertion validation
- Automatic user provisioning
- Just-In-Time (JIT) user creation

---

### 2. Mobile SDKs

**Platforms**:
- iOS (Swift)
- Android (Kotlin)

**Features**:
- Native OAuth flow
- Secure session storage
- Deep linking support

---

## Deferred Features (Post-MVP)

The following features have been identified but deferred to post-MVP phases:

- **Advanced Analytics Dashboard** - User engagement metrics, login trends, feature usage
- **Rate Limiting Per Plan** - Enforce different rate limits based on subscription tier
- **Custom Domain Support** - Allow apps to use custom domains for auth flows
- **IP Allowlisting** - Restrict access to app by IP address
- **Compliance Features** - GDPR data export, right to be forgotten, audit log compliance
- **API Key Management** - Service-to-service authentication with API keys
- **Webhook Delivery Confirmation** - Signed receipts for webhook delivery
- **OAuth Provider Extensions** - Support for more OAuth providers (GitHub, GitLab, Discord)
- **Single Logout (SLO)** - Coordinated session termination across apps
- **Biometric Authentication** - Fingerprint/Face recognition on mobile

---

## Implementation Strategy

### Phase 2 Approach

1. **Priority Order**: Email Auth → Activity Logs → Webhooks
2. **Testing**: Unit tests for new endpoints, integration tests for event flows
3. **Documentation**: API documentation updates, webhook event schema docs
4. **Database**: All schema changes via Drizzle migrations (v0001, v0002, etc.)
5. **Monitoring**: Enhanced logging for webhook deliveries and failures

### Quality Checklist

- [ ] All endpoints have TypeScript types
- [ ] Input validation with Zod schemas
- [ ] Error handling with appropriate HTTP status codes
- [ ] Rate limiting applied to sensitive endpoints
- [ ] Database queries optimized with indexes
- [ ] Security review completed
- [ ] E2E tests passing
- [ ] Documentation updated

---

## Success Metrics

| Feature | KPI |
|---------|-----|
| Email Auth | 30% of new signups use email login |
| Activity Logs | 100% of security events logged, <100ms query time |
| Webhooks | 99.9% delivery success rate (with retries) |
| RBAC | 95% of project invitations use appropriate roles |

---

## Timeline Summary

```
Phase 2 (Q2-Q4 2025)
├── Email Auth: weeks 1-3
├── Activity Logs: weeks 3-5
└── Webhooks: weeks 5-8

Phase 3 (Q1 2025) - MFA & WebAuthn
Phase 4 (Q2 2025) - SAML & Mobile SDKs
```

---

## Notes

- All Phase 2 features maintain backward compatibility with Phase 1
- Session management and payment processing remain unchanged
- Estimated team effort: 2-3 engineers for 12-16 weeks
- Post-MVP monitoring critical for webhook reliability
