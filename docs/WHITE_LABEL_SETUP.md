# White-Label Marketplace Setup Guide

Complete guide for deploying a white-label instance of this marketplace platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Firebase Setup](#firebase-setup)
3. [Stripe Setup](#stripe-setup)
4. [Environment Configuration](#environment-configuration)
5. [Brand Assets](#brand-assets)
6. [Deployment](#deployment)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- [ ] Node.js 18+ installed
- [ ] Git installed
- [ ] Google account (for Firebase)
- [ ] Stripe account
- [ ] Custom domain (optional but recommended)
- [ ] Brand assets (logo, favicon, OG image)

---

## Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name (e.g., "YourBrand Marketplace")
4. Enable Google Analytics (recommended)
5. Click "Create project"

### 2. Enable Authentication

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable the following providers:
   - ✅ Email/Password
   - ✅ Google
   - ✅ (Optional) Facebook, Apple, etc.

### 3. Create Firestore Database

1. Go to **Firestore Database** > **Create database**
2. Choose production mode
3. Select region (e.g., `australia-southeast1` for Australia)
4. Click "Enable"

### 4. Create Storage Bucket

1. Go to **Storage** > **Get started**
2. Use default security rules (we'll deploy custom ones later)
3. Select same region as Firestore

### 5. Get Firebase Config

1. Go to **Project Settings** (gear icon) > **General**
2. Scroll to "Your apps" > Click web icon (`</>`)
3. Register app with nickname (e.g., "Web App")
4. Copy the config values - you'll need these for `.env.local`

### 6. Generate Service Account Key

1. Go to **Project Settings** > **Service accounts**
2. Click "Generate new private key"
3. Save the JSON file securely
4. Extract these values for `.env.local`:
   - `project_id`
   - `client_email`
   - `private_key`

---

## Stripe Setup

### 1. Create Stripe Account

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Create account or sign in
3. Complete business verification

### 2. Enable Stripe Connect

1. Go to **Connect** > **Settings**
2. Enable **Express** accounts (for marketplace sellers)
3. Configure branding (logo, colors)

### 3. Get API Keys

1. Go to **Developers** > **API keys**
2. Copy **Publishable key** and **Secret key**
3. For production, use live keys (starts with `pk_live_` and `sk_live_`)
4. For testing, use test keys (starts with `pk_test_` and `sk_test_`)

### 4. Set Up Webhooks

1. Go to **Developers** > **Webhooks**
2. Click "Add endpoint"
3. Enter URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `account.updated`
5. Copy the webhook signing secret

---

## Environment Configuration

### 1. Copy Template

```bash
cp .env.template .env.local
```

### 2. Fill in Required Values

Edit `.env.local` and update these **required** fields:

```bash
# Company
NEXT_PUBLIC_COMPANY_NAME="YourBrand"
NEXT_PUBLIC_SITE_URL="https://yourdomain.com"

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"
NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789:web:abc123"

# Firebase Admin
FIREBASE_ADMIN_PROJECT_ID="your-project-id"
FIREBASE_ADMIN_CLIENT_EMAIL="firebase-adminsdk@your-project.iam.gserviceaccount.com"
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 3. Customize Branding (Optional)

```bash
NEXT_PUBLIC_PRIMARY_COLOR="#your-color"
NEXT_PUBLIC_COMPANY_TAGLINE="Your tagline here"
COMPANY_EMAIL="support@yourdomain.com"
```

### 4. Configure Features (Optional)

Enable/disable features:

```bash
ENABLE_WTB="true"
ENABLE_BIDSY="true"
ENABLE_VAULT="false"  # Disable if not needed
```

---

## Brand Assets

### 1. Prepare Assets

Create the following files:

- **Logo**: `public/logo.png` (512x512px, transparent background)
- **Favicon**: `public/favicon.ico` (32x32px)
- **OG Image**: `public/og-image.jpg` (1200x630px for social sharing)

### 2. Optional Assets

- **Dark Logo**: `public/logo-dark.png` (for dark mode)
- **Email Header**: `public/brand/email-header.png`

### 3. Update References

If using custom paths, update in `.env.local`:

```bash
NEXT_PUBLIC_LOGO_URL="/your-logo.png"
NEXT_PUBLIC_FAVICON_URL="/your-favicon.ico"
NEXT_PUBLIC_OG_IMAGE_URL="/your-og-image.jpg"
```

---

## Deployment

### 1. Install Dependencies

```bash
npm install
```

### 2. Deploy Firebase Rules & Indexes

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Deploy Storage rules
firebase deploy --only storage
```

### 3. Create Initial Admin User

Run the admin setup script:

```bash
node set-super-admin.js YOUR_EMAIL@example.com
```

### 4. Test Locally

```bash
npm run dev
```

Visit `http://localhost:9004` and verify:
- ✅ Site loads with your branding
- ✅ Can sign in
- ✅ Features are enabled/disabled correctly

### 5. Build for Production

```bash
npm run build
```

Fix any build errors before deploying.

### 6. Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

### 7. Configure Custom Domain (Optional)

1. In Firebase Console, go to **Hosting**
2. Click "Add custom domain"
3. Follow DNS configuration instructions
4. Wait for SSL certificate provisioning (can take 24 hours)

---

## Verification

### Post-Deployment Checklist

- [ ] Site loads at your domain
- [ ] SSL certificate is active (https://)
- [ ] Company name displays correctly
- [ ] Logo and favicon appear
- [ ] Can create account
- [ ] Can sign in
- [ ] Can create listing
- [ ] Stripe payment works
- [ ] Email notifications work (if configured)
- [ ] All enabled features are accessible
- [ ] Disabled features are hidden
- [ ] SEO metadata is correct (check page source)
- [ ] Social sharing works (test on Twitter/Facebook)

### Test User Flows

1. **Buyer Flow**:
   - Browse listings
   - Search products
   - View product details
   - Make purchase
   - Receive confirmation

2. **Seller Flow**:
   - Create account
   - Complete verification
   - Create listing
   - Receive offer/sale
   - Process payout

3. **Admin Flow**:
   - Access admin dashboard
   - Approve verification
   - Manage listings
   - View analytics

---

## Troubleshooting

### Build Errors

**Error**: `NEXT_PUBLIC_FIREBASE_API_KEY is not defined`
- **Solution**: Ensure `.env.local` exists and contains all required variables

**Error**: `Module not found: Can't resolve '@/config/brand'`
- **Solution**: Restart dev server: `npm run dev`

### Firebase Errors

**Error**: `Permission denied` when accessing Firestore
- **Solution**: Deploy Firestore rules: `firebase deploy --only firestore:rules`

**Error**: `Index not found`
- **Solution**: Deploy indexes: `firebase deploy --only firestore:indexes`

### Stripe Errors

**Error**: `Invalid API key`
- **Solution**: Verify you're using the correct publishable/secret key pair

**Error**: `Webhook signature verification failed`
- **Solution**: Update `STRIPE_WEBHOOK_SECRET` with correct signing secret

### Deployment Errors

**Error**: `Firebase project not found`
- **Solution**: Run `firebase use --add` and select your project

**Error**: `Build failed`
- **Solution**: Run `npm run build` locally to see detailed errors

---

## Next Steps

After successful deployment:

1. **Configure Email**: Set up transactional email service (SendGrid, Mailgun, etc.)
2. **Set Up Analytics**: Add Google Analytics tracking ID
3. **Create Content**: Add categories, featured items, etc.
4. **Test Payments**: Process test transactions
5. **Monitor**: Set up error tracking (Sentry, LogRocket, etc.)
6. **Backup**: Configure automated Firestore backups
7. **Scale**: Monitor usage and upgrade Firebase plan as needed

---

## Support

For issues or questions:

1. Check the [troubleshooting section](#troubleshooting)
2. Review Firebase and Stripe documentation
3. Contact the development team

---

## Security Reminders

- ✅ Never commit `.env.local` to version control
- ✅ Use different Firebase projects for dev/staging/production
- ✅ Rotate API keys regularly
- ✅ Enable 2FA on Firebase and Stripe accounts
- ✅ Monitor for suspicious activity
- ✅ Keep dependencies updated

---

**Congratulations!** Your white-label marketplace is now live! 🎉
