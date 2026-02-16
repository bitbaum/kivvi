# Email Setup Guide - Brevo SMTP

Kivvi now uses **Brevo SMTP** via nodemailer for sending emails (password resets, invoice emails, etc.).

## ✅ What I've Done (Code Changes)

1. ✅ Installed `nodemailer` and `@types/nodemailer`
2. ✅ Created email configuration (`/apps/web/lib/config/email.ts`)
3. ✅ Created transporter singleton (`/apps/web/lib/email/transporter.ts`)
4. ✅ Updated password reset emails to use nodemailer
5. ✅ Updated document emails to use nodemailer
6. ✅ Added EMAIL_* variables to `.env.example`
7. ✅ Configured to send from `noreply@revamp-it.ch` (already verified domain)

## 🔧 What You Need to Do (2 minutes)

### Step 1: Copy Revampit's Brevo Credentials

Since `kivvi.vercel.app` can't be verified in Brevo (Vercel doesn't allow custom DNS), we'll send from `revamp-it.ch` which is already verified for Revampit.

**Create `/apps/web/.env.local`:**

```bash
# Copy these EXACT values from Revampit's .env.local
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=<copy from Revampit>
EMAIL_PASS=<copy from Revampit>
EMAIL_FROM=noreply@revamp-it.ch  # ← Same as Revampit
```

### Step 2: Test It

```bash
cd /home/g/dev/kivvi
pnpm dev
```

Then test password reset:
1. Go to http://localhost:3000/forgot-password
2. Enter your email address
3. Check inbox - email will come from `noreply@revamp-it.ch`
4. Subject line says "Passwort zurücksetzen - Kivvi"
5. Email body clearly says "Kivvi"

**Done!** No domain verification needed. ✅

## 📧 How Emails Look

**From:** noreply@revamp-it.ch
**Subject:** Passwort zurücksetzen - Kivvi
**Body:** Email header says "Kivvi" and has Kivvi branding

This is **totally normal** - many SaaS products send from a parent company domain before they have their own domain.

## 📊 Cost

- **FREE** - shares Revampit's 300 emails/day limit
- Both apps count toward same quota
- Typical usage: 10-50 emails/day total

## 🐛 Troubleshooting

### "EMAIL_USER and EMAIL_PASS fehlen"
```bash
# Check Revampit's .env.local has these:
EMAIL_USER=...
EMAIL_PASS=...

# Copy exact values to Kivvi's .env.local
```

### "Authentication failed"
```bash
# Regenerate SMTP key in Brevo:
# 1. Go to https://app.brevo.com/settings/keys/smtp
# 2. Click "Generate new SMTP key"
# 3. Update EMAIL_PASS in BOTH projects
```

### Test SMTP connection:
```bash
cd /home/g/dev/kivvi/apps/web
node -e "
const nodemailer = require('nodemailer');
const t = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  auth: {
    user: 'YOUR_USER',  // from Revampit
    pass: 'YOUR_PASS'   // from Revampit
  }
});
t.verify()
  .then(() => console.log('✅ SMTP works!'))
  .catch(err => console.error('❌ Failed:', err.message));
"
```

## 🔮 When You Buy a Domain

If you buy `kivvi.ch` or `kivvi.swiss` later:

1. Verify the new domain in Brevo
2. Update `EMAIL_FROM=noreply@kivvi.ch`
3. Redeploy

For now, sending from `revamp-it.ch` works perfectly.

---

**That's it!** Just copy the env vars from Revampit and you're done.
