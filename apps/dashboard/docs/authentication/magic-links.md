---
title: Magic Links
description: Passwordless authentication with magic links
---

Magic links provide passwordless authentication via email.

## How It Works

1. User enters their email
2. Nube Auth sends a secure link to their inbox
3. User clicks the link
4. User is authenticated

## Implementation

### Send Magic Link

```typescript
// Request a magic link
await nube-auth.sendMagicLink({ 
  email: 'user@example.com' 
});

// Show user a message
alert('Check your email for a login link!');
```

### Handle Magic Link

On your callback page, verify the token:

```typescript
// In your /auth/magic route
const token = new URLSearchParams(window.location.search).get('token');

const result = await nube-auth.verifyMagicLink({ token });

if (result.success) {
  // User is now authenticated
  const user = await nubeAuth.getUser();
  redirect('/dashboard');
} else {
  // Link expired or invalid
  redirect('/login?error=invalid_link');
}
```

## Configuration

### Environment Variables

```bash
# Magic link expiration (seconds)
MAGIC_LINK_TTL=600  # 10 minutes

# Email provider
EMAIL_PROVIDER=resend  # or 'sendgrid', 'smtp'
EMAIL_FROM=auth@yourdomain.com

# Resend
EMAIL_API_KEY=your-api-key

# SendGrid
SENDGRID_API_KEY=your-api-key
```

### Custom Email Template

Customize the magic link email in your dashboard or via API:

```typescript
await nube-auth.admin.updateEmailTemplate({
  type: 'magic_link',
  subject: 'Sign in to {{appName}}',
  html: `
    <h1>Sign in to {{appName}}</h1>
    <p>Click the button below to sign in:</p>
    <a href="{{magicLink}}">Sign In</a>
    <p>This link expires in 10 minutes.</p>
  `
});
```

## Security

Magic links include several security features:

- **One-time use** - Links are invalidated after use
- **Short expiration** - Default 10 minutes
- **Rate limiting** - Max 5 requests per email per hour
- **IP validation** - Optional same-IP requirement

## Best Practices

1. **Clear messaging** - Tell users to check spam folders
2. **Resend option** - Allow users to request a new link
3. **Fallback auth** - Offer alternative login methods
4. **Expiration notice** - Show when the link will expire
