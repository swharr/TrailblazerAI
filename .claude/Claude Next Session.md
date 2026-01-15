# Next Session: Email on User Signup

## Goal
Send a welcome email when a user signs up for TrailBlazer AI.

## Current State
- User registration works via `/api/auth/register`
- No email service configured
- `emailVerified` field exists in User model but unused

## Recommended Approach: Resend

**Why Resend?**
- Simple API, great DX
- Generous free tier (3,000 emails/month)
- Works well with Next.js/Vercel
- React Email support for templates

## Implementation Plan

### 1. Install Dependencies
```bash
npm install resend
npm install @react-email/components  # Optional: for nice templates
```

### 2. Add Environment Variables
```bash
# .env.local
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@yourdomain.com
```

Add to GitHub Secrets:
- `RESEND_API_KEY`

### 3. Create Email Utility
**File**: `src/lib/email.ts`
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(email: string, name?: string) {
  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'TrailBlazer AI <noreply@trailblazer.ai>',
    to: email,
    subject: 'Welcome to TrailBlazer AI!',
    html: `
      <h1>Welcome${name ? `, ${name}` : ''}!</h1>
      <p>Thanks for signing up for TrailBlazer AI.</p>
      <p>Start planning your next overland adventure:</p>
      <a href="https://demoapp.t8rsk8s.io/analyze">Analyze a Trail Photo</a>
    `,
  });
}
```

### 4. Update Registration Route
**File**: `src/app/api/auth/register/route.ts`

Add after user creation:
```typescript
// Send welcome email (don't block registration on email failure)
try {
  await sendWelcomeEmail(user.email, user.name);
} catch (emailError) {
  console.error('Failed to send welcome email:', emailError);
}
```

### 5. Optional: Email Templates with React Email
Create `src/emails/WelcomeEmail.tsx` for a nicer template.

### 6. Update GitHub Actions Secrets
Add `RESEND_API_KEY` to GitHub Secrets and update workflow if needed.

## Domain Setup (if using custom domain)
1. Add domain in Resend dashboard
2. Add DNS records (SPF, DKIM, DMARC)
3. Verify domain

## Future Enhancements
- [ ] Email verification flow
- [ ] Password reset emails
- [ ] Trail analysis completion notifications
- [ ] Route sharing via email

## Resources
- Resend Docs: https://resend.com/docs
- React Email: https://react.email
- NextAuth Email Provider: https://next-auth.js.org/providers/email
