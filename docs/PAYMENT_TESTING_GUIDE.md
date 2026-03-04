# Payment Testing Guide

## Testing Payment Flows in Proofa

There are two modes for testing payments in the admin playground:

### 1. Simulate Mode (Recommended for Local Development) ✨

**Best for**: Local testing, rapid iteration, CI/CD

**How it works**:
- No real payment provider integration needed
- Instantly simulates webhook events
- No external network access required
- Perfect for localhost development

**Steps**:
1. Navigate to Admin Dashboard → Test Playground → Payments
2. Select **"Simulate (Instant)"** mode
3. Choose provider (Stripe/LemonSqueezy/Dodo)
4. Configure entities (project, app, user, plan)
5. Click "Start Test Flow"
6. Use the event simulator buttons to trigger outcomes:
   - ✓ **Success**: Creates license, processes payment
   - ⚠️ **Failed**: Creates failed transaction
   - ❌ **Cancel**: Cancels subscription
   - 💰 **Refund**: Creates refund transaction

**Advantages**:
- ✅ Instant results (no waiting)
- ✅ No webhook configuration needed
- ✅ Works on localhost
- ✅ No external dependencies
- ✅ No real API calls to providers

---

### 2. Live Mode (Real Provider Integration) 

**Best for**: Testing actual provider integration, staging/production testing

**How it works**:
- Creates real checkout sessions with payment providers
- Users complete actual test payments on provider's hosted page
- Provider sends real webhooks to Proofa
- Full end-to-end flow testing

**Requirements**:
1. **Provider Configuration**: Add real test API keys in Project → Payment Providers
2. **Webhook Setup**: Provider must be able to send webhooks to your Proofa instance

#### Webhook Configuration

**In Production/Staging** (with public URL):
1. Go to your payment provider dashboard (Stripe/LemonSqueezy/Dodo)
2. Add webhook endpoint URL:
   - Stripe: `https://your-domain.com/v1/payment/webhooks/stripe`
   - LemonSqueezy: `https://your-domain.com/v1/payment/webhooks/lemonsqueezy`
   - Dodo: `https://your-domain.com/v1/payment/webhooks/dodo`
3. Copy the webhook secret
4. Add to Proofa provider configuration

**In Local Development** (localhost):

**Option A: Use Simulate Mode** (Recommended)
- Just use simulate mode instead - no webhook setup needed!

**Option B: Use ngrok or similar tunnel**
1. Install ngrok: `brew install ngrok` or download from https://ngrok.com
2. Start your gateway: `pnpm --filter @proofa/gateway dev`
3. Expose it: `ngrok http 3001`
4. Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)
5. Configure provider webhook URL: `https://abc123.ngrok.io/v1/payment/webhooks/stripe`
6. Test payment flow

**Option C: Use Manual Webhook Trigger (Fallback)**
If the webhook doesn't arrive after payment:
1. Complete payment on provider's checkout page
2. Return to Test Playground
3. Click **"✓ Success"** button under "Manual Webhook Trigger"
4. This manually processes the payment (simulates webhook)

---

## Common Issues

### ⏳ Payment Stuck in "Processing" State

**Symptom**: After completing payment on provider's page, license never gets created and payment shows "Processing" indefinitely.

**Cause**: Webhook from provider never reached Proofa

**Solutions**:
1. **Switch to Simulate Mode** (easiest) - No webhooks needed
2. **Setup ngrok** - Expose localhost for webhook delivery
3. **Use Manual Webhook Trigger** - Click "✓ Success" button after payment completes
4. **Check webhook logs** - Admin Dashboard → Webhook Monitoring to see if webhook was received

---

### ❌ "Live mode requires configured payment provider" Error

**Cause**: No payment provider credentials configured for the selected project

**Solution**:
1. Go to Admin Dashboard → Projects → Select Project
2. Navigate to Payment Providers tab
3. Add provider credentials (API keys, secrets)
4. Ensure "Test" environment is selected
5. Return to Test Playground and retry

---

### ⚠️ Provider API Error During Checkout Creation

**Cause**: Invalid or expired API credentials

**Solution**:
1. Verify API keys in provider dashboard
2. Ensure using **test mode** credentials (not production)
3. Check API key permissions
4. Update credentials in Project → Payment Providers

---

## Testing Checklist

**Before Testing**:
- [ ] Payment provider configured in Proofa (for live mode)
- [ ] Webhook URL configured in provider dashboard (for live mode)
- [ ] Test mode credentials used (never production keys)
- [ ] At least one active plan exists for the app

**During Testing**:
- [ ] Verify checkout session created successfully
- [ ] Complete payment on provider page (live mode)
- [ ] Check webhook logs for incoming events
- [ ] Verify license created with correct status
- [ ] Verify transaction recorded accurately
- [ ] Test different event types (success, fail, cancel, refund)

**After Testing**:
- [ ] Clean up test data using "End Session & Cleanup" button
- [ ] Review webhook logs for any errors
- [ ] Verify no unexpected charges in provider dashboard

---

## Best Practices

1. **Use Simulate Mode for Development**: Faster, no external dependencies
2. **Use Live Mode for Integration Testing**: Verify actual provider integration works
3. **Always Clean Up**: Use cleanup button to remove test data
4. **Monitor Webhook Logs**: Check Admin → Webhook Monitoring for issues
5. **Test All Scenarios**: Success, failure, cancellation, refund
6. **Use ngrok for Local Webhooks**: Only if you need full end-to-end testing locally

---

## Webhook Event Types

### Successful Payment
- **Stripe**: `checkout.session.completed`, `invoice.paid`
- **LemonSqueezy**: `order_created`, `subscription_payment_success`
- **Dodo**: `payment.succeeded`

### Failed Payment
- **Stripe**: `invoice.payment_failed`, `charge.failed`
- **LemonSqueezy**: `subscription_payment_failed`
- **Dodo**: `payment.failed`

### Cancellation
- **Stripe**: `customer.subscription.deleted`
- **LemonSqueezy**: `subscription_cancelled`
- **Dodo**: `subscription.canceled`

### Refund
- **Stripe**: `charge.refunded`
- **LemonSqueezy**: `subscription_payment_refunded`
- **Dodo**: `charge.refunded`

---

## Troubleshooting

**Check Logs**:
```bash
# Gateway logs (webhook receipt)
tail -f apps/services/gateway/logs/app.log

# Core logs (webhook processing)
tail -f apps/services/core/logs/app.log

# Worker logs (background jobs)
tail -f apps/services/workers/logs/app.log
```

**Check Database**:
```sql
-- Check webhook logs
SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 10;

-- Check payment transactions
SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 10;

-- Check licenses
SELECT * FROM licenses ORDER BY created_at DESC LIMIT 10;
```

---

## Support

- **Documentation**: [docs/PAYMENT_SYSTEM_DESIGN.md](./PAYMENT_SYSTEM_DESIGN.md)
- **Webhook Monitoring**: Admin Dashboard → Webhook Monitoring
- **Transaction History**: Admin Dashboard → Billing → Transactions

---

**Last Updated**: March 4, 2026
