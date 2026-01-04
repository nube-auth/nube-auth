# Phase 1 Implementation - Feature Overview

## Quick Start

The Phase 1 implementation adds three critical MVP features to the Proofa platform:

1. **Session Management** - View and revoke user sessions
2. **Rolling Session TTL** - Sessions stay active while in use  
3. **Payment Processing** - Stripe integration for subscriptions

---

## 1. Session Management API

### Endpoints

**GET `/v1/auth/sessions`**
- Lists all active sessions for authenticated user
- Response includes session ID, app, created date, last activity
- Sorted by most recent activity first

```bash
curl -H "Cookie: proofa_user_session=..." \
  https://api.proofa.sh/v1/auth/sessions

# Response:
{
  "sessions": [
    {
      "id": "session_abc123",
      "appId": "app_xyz",
      "createdAt": "2025-01-23T10:00:00Z",
      "lastActivity": "2025-01-23T14:30:00Z",
      "isCurrentSession": true
    }
  ]
}
```

**DELETE `/v1/auth/sessions/:sessionId`**
- Revokes a specific session
- Cannot revoke current session (use `/logout` instead)
- Returns 403 if trying to revoke another user's session

```bash
curl -X DELETE \
  -H "Cookie: proofa_user_session=..." \
  https://api.proofa.sh/v1/auth/sessions/session_abc123

# Response: { "message": "Session revoked successfully" }
```

### Use Cases

- **Security**: Users can revoke old sessions from lost devices
- **Account Management**: View active login locations
- **Compliance**: Audit trail of session activity

---

## 2. Rolling Session TTL

### What This Means

Sessions now extend automatically when users are active:

```
User logs in on Day 1
Session expires on Day 8 (7 days from now)

User makes request on Day 3
Session now expires on Day 10 (7 days from now)

User makes request on Day 5
Session now expires on Day 12 (7 days from now)

User inactive from Day 7
Session expires on Day 14 (original was Day 8, but no new request)
```

### Benefits

✅ **Better UX**: Users stay logged in while they're active
✅ **Security**: Auto-logout after inactivity period
✅ **No Changes Needed**: Transparent to frontend

### Implementation

The session TTL updates automatically on each request. No frontend changes required.

---

## 3. Payment Processing

### Endpoints

**GET `/v1/payment/plans/:appId`**
- List all subscription plans for an app
- No authentication required

```bash
curl https://api.proofa.sh/v1/payment/plans/app_123

# Response:
{
  "plans": [
    {
      "publicId": "plan_starter",
      "name": "Starter",
      "slug": "starter",
      "monthlyPrice": 2999,     // $29.99
      "yearlyPrice": 29990,     // $299.90
      "oneTimePrice": null,
      "durationDays": 30,
      "trialEnabled": true,
      "trialDays": 7,
      "features": { /* plan features */ }
    },
    {
      "publicId": "plan_pro",
      "name": "Professional",
      "slug": "pro",
      "monthlyPrice": 9999,
      "yearlyPrice": 99990,
      "durationDays": 30,
      "features": { /* features */ }
    }
  ]
}
```

**POST `/v1/payment/checkout`**
- Create Stripe checkout session
- User redirected to Stripe payment page
- Returns checkout URL and session ID

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Cookie: proofa_user_session=..." \
  https://api.proofa.sh/v1/payment/checkout \
  -d '{
    "appId": "app_123",
    "planId": "plan_starter",
    "interval": "month"  # or "year", "one-time"
  }'

# Response:
{
  "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_...",
  "sessionId": "cs_test_..."
}
```

**POST `/v1/payment/webhook`**
- Stripe webhook endpoint (internal use)
- Automatically creates/updates user licenses on payment
- No manual calls needed

**GET `/v1/payment/license/:appId`**
- Check user's license status for an app
- Requires authentication

```bash
curl -H "Cookie: proofa_user_session=..." \
  https://api.proofa.sh/v1/payment/license/app_123

# Response (if license exists):
{
  "hasLicense": true,
  "license": {
    "publicId": "lic_abc123",
    "status": "active",
    "validUntil": "2025-02-23T00:00:00Z",
    "isValid": true
  }
}

# Response (if no license):
{
  "hasLicense": false,
  "error": "No active license"
}
```

### Payment Flow

```
1. User clicks "Subscribe"
2. GET /plans → Shows available plans
3. POST /checkout → Creates Stripe session, returns URL
4. User → Stripe checkout page
5. Stripe → Payment processed
6. Stripe → POST /webhook (calls our API)
7. Webhook → Creates license in database
8. User → Redirected to success page
9. GET /license → Shows active license
```

### Supported Billing Intervals

- **Monthly** - Recurring monthly subscription
- **Yearly** - Recurring annual subscription (usually cheaper)
- **One-Time** - Single payment (not recurring)

### License Validation

Licenses are automatically created when:
- User completes Stripe checkout
- Payment is successfully processed
- Webhook is received and verified

Licenses include:
- Expiration date (based on plan duration)
- Status (active, canceled, expired)
- Stripe customer/subscription IDs for syncing

---

## Configuration

### Environment Variables

Required for payment processing:

```bash
# In .env or deployment config
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
FRONTEND_URL=https://user.proofa.sh
```

### Stripe Setup

1. Create Stripe account: https://stripe.com
2. Get API keys from Stripe dashboard
3. Register webhook endpoint:
   - URL: `https://api.proofa.sh/v1/payment/webhook`
   - Events: checkout.session.completed, customer.subscription.*, etc.
4. Configure payment provider in database

---

## API Response Codes

### Session Endpoints

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (e.g., current session revoke attempt) |
| 401 | Not authenticated |
| 403 | Permission denied (not session owner) |
| 404 | Session not found |
| 500 | Server error |

### Payment Endpoints

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Invalid interval for plan |
| 401 | Not authenticated |
| 404 | Plan, app, or license not found |
| 500 | Server error |

---

## Security Features

✅ **Session Ownership Validation** - Users can only revoke their own sessions
✅ **IP/UA Fingerprinting** - Prevents session hijacking
✅ **HMAC Signature Verification** - Stripe webhooks validated
✅ **Rate Limiting** - Auth and payment endpoints protected
✅ **Audit Logging** - All actions logged for compliance
✅ **HTTPS Required** - All endpoints use encryption
✅ **CSRF Protection** - Admin operations protected

---

## Monitoring & Logs

### Key Log Messages

```
"Session revoked by user"
- When: User revokes a session
- Action: Check if unexpected session removal

"Checkout session created"
- When: User initiates payment
- Action: Normal flow indicator

"License created after payment"
- When: Payment webhook received
- Action: Success indicator - user can now use app

"Webhook processing error"
- When: Stripe webhook fails
- Action: Investigate immediately - may lose payment record
```

### Metrics to Monitor

- Session revocation rate (should be low)
- Checkout completion rate (target >70%)
- Webhook success rate (target >99%)
- License lookup latency (target <50ms)

---

## Troubleshooting

### Problem: Can't see sessions
**Solution**: Make sure you're authenticated. Sessions endpoint requires login cookie.

### Problem: Payment stuck in checkout
**Solution**: Check that Stripe API keys are correct and account is in good standing.

### Problem: License not created after payment
**Solution**: 
1. Verify webhook was received (check logs)
2. Verify plan has duration_days set
3. Check database for license record
4. Review Stripe webhook signing secret

### Problem: Session expires too quickly
**Solution**: This indicates no activity. Session TTL only rolls on requests. If user goes inactive, session expires normally.

---

## Documentation Links

- **Phase 1 Summary**: `/docs/PHASE_1_IMPLEMENTATION_SUMMARY.md`
- **Deployment Checklist**: `/docs/PHASE_1_DEPLOYMENT_CHECKLIST.md`
- **Phase 2 Roadmap**: `/docs/PHASE_2_ROADMAP.md`

---

## FAQ

**Q: Can users have unlimited sessions?**
A: Yes, they can log in on multiple devices. Each device gets its own session.

**Q: What happens when subscription expires?**
A: License status changes to "expired". User no longer has access unless they renew.

**Q: How long are sessions active?**
A: 7 days of inactivity. If user is active, session extends automatically.

**Q: Can I test payments without a Stripe account?**
A: Yes, use test mode keys. Stripe provides test card numbers.

**Q: How do I refund a payment?**
A: Use Stripe dashboard. This updates the license status automatically.

---

## Support

For issues or questions:
1. Check logs: `tail -f gateway.log`
2. Review documentation above
3. Check deployment checklist
4. Contact development team

---

Last Updated: January 2025
Phase 1 Implementation Status: ✅ Complete and Production-Ready
