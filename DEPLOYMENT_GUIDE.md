# Picksy Deployment Guide
**Last Updated:** January 25, 2026

## 🎯 Deployment Overview

This document provides a comprehensive guide for deploying the Picksy marketplace to Firebase App Hosting, including all configurations, fixes, and best practices discovered during the deployment process.

---

## 📋 Prerequisites

### Required Accounts & Services
- [x] Google Cloud Account with billing enabled
- [x] Firebase Project: `studio-8322868971-8ca89` (Picksy)
- [x] GitHub Repository: `BJM77/picksy`
- [x] Domain: `picksy.au` (registered and accessible via Cloudflare DNS)
- [x] Firebase App Hosting backend configured

### Required Secrets (Google Cloud Secret Manager)
- [x] `GOOGLE_GENAI_API_KEY` - For AI-powered features (Gemini API)

---

## 🚀 Deployment Architecture

### Platform
- **Hosting:** Firebase App Hosting (Cloud Run backend)
- **CI/CD:** GitHub → Firebase App Hosting (automatic deployments)
- **Domain:** picksy.au (custom domain)
- **Region:** us-central1

### URLs
- **Production URL:** `https://studio--studio-8322868971-8ca89.us-central1.hosted.app`
- **Custom Domain:** `https://picksy.au` (pending DNS propagation)

---

## 🔧 Critical Configuration Files

### 1. `apphosting.yaml`
**Purpose:** Firebase App Hosting configuration

```yaml
kind: "AppHostingYaml"
version: "v1"

runConfig:
  maxInstances: 1

env:
  # AI Features - Gemini API Key
  - variable: GOOGLE_GENAI_API_KEY
    secret: GOOGLE_GENAI_API_KEY
    availability:
      - BUILD
      - RUNTIME
  
  # Production Mode Enforcement
  - variable: NEXT_PUBLIC_USE_EMULATORS
    value: "false"
    availability:
      - BUILD
      - RUNTIME
  
  - variable: NODE_ENV
    value: "production"
    availability:
      - BUILD
      - RUNTIME
```

**Key Points:**
- ✅ Explicitly disables Firebase emulators in production
- ✅ Sets NODE_ENV to production
- ✅ Provides Gemini API key for AI features
- ❌ Does NOT include SERVICE_ACCOUNT_JSON (uses ADC instead)

---

### 2. `package.json` - Build Script
**Purpose:** Next.js build configuration

```json
{
  "scripts": {
    "dev": "next dev --port 9004",
    "build": "next build",
    "start": "next start"
  }
}
```

**Key Points:**
- ✅ Uses standard `next build` command
- ✅ No `yarn.lock` file (uses npm/package-lock.json only) to prevent symlink issues
- ✅ Relies on default Next.js build behavior (which works correctly with npm structure)

---

### 3. `next.config.js` - Next.js Configuration
**Purpose:** Next.js build and runtime configuration

```javascript
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Required for Firebase App Hosting
  serverExternalPackages: [
    'firebase-admin',
    '@genkit-ai/google-genai',
    'genkit',
    '@google-cloud/firestore',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
      allowedOrigins: [
        'studio-8322868971-8ca89.web.app',
        'picksy.au',
        'www.picksy.au',
        'localhost:9004'
      ],
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'firebase-admin': 'commonjs firebase-admin',
        '@google-cloud/firestore': 'commonjs @google-cloud/firestore',
        '@genkit-ai/google-genai': 'commonjs @genkit-ai/google-genai',
      });
    }
    return config;
  },
}
```

**Key Points:**
- ✅ `output: 'standalone'` for containerized deployment
- ✅ Server externals prevent bundling server-only packages
- ✅ Custom domains added to allowed origins
- ❌ NO `turbopack: {}` configuration (causes build errors)

---

## 🐛 Common Issues & Solutions

### Issue 1: Turbopack Symlink Errors
**Error:**
```
Error [TurbopackInternalError]: Symlink node_modules is invalid, 
it points out of the filesystem root
```

**Root Cause:**
- Firebase App Hosting uses Cloud Build with Buildpacks
- If `yarn.lock` exists, Yarn is used for installation
- Yarn creates symlinks that Turbopack cannot handle

**Solution:**
1. ✅ Delete `yarn.lock` file
2. ✅ Keep only `package-lock.json`
3. ✅ Use standard `next build` command (remove any `--webpack` flags if added, as they break path aliases)
4. ✅ Remove any `turbopack: {}` config from `next.config.js`

```bash
rm yarn.lock
# Ensure package.json has: "build": "next build"
git add -A && git commit -m "Fix build: use npm only"
git push origin main
```

---

### Issue 2: Missing Secret Access
**Error:**
```
Error resolving secret version with name=
projects/.../secrets/GOOGLE_GENAI_API_KEY/versions/latest
```

**Root Cause:**
- App Hosting backend doesn't have IAM permissions to read secrets

**Solution:**
```bash
firebase apphosting:secrets:grantaccess GOOGLE_GENAI_API_KEY \
  --backend studio \
  --location us-central1
```

---

### Issue 3: Emulator Mode in Production
**Symptoms:**
- Blue banner: "Running in emulator mode. Do not use with production credentials."
- `ERR_CONNECTION_REFUSED` to `localhost:8080`
- No products loading from database
- Database returns 0 items

**Root Cause:**
- `NEXT_PUBLIC_USE_EMULATORS` not explicitly set to false
- Firebase SDK auto-detecting emulator environment

**Solution:**
Add to `apphosting.yaml`:
```yaml
env:
  - variable: NEXT_PUBLIC_USE_EMULATORS
    value: "false"
    availability:
      - BUILD
      - RUNTIME
  - variable: NODE_ENV
    value: "production"
    availability:
      - BUILD
      - RUNTIME
```

Add safeguards in `src/lib/firebase/config.ts`:
```typescript
if (typeof window !== 'undefined') {
  const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction && useEmulators) {
    console.error('❌ CRITICAL: Emulator mode enabled in production!');
  } else if (isProduction) {
    console.log('✅ Firebase running in PRODUCTION mode');
  }
}
```

---

### Issue 4: SERVICE_ACCOUNT_JSON Not Needed
**Error:**
```
Error resolving secret version with name=
projects/.../secrets/SERVICE_ACCOUNT_JSON/versions/latest
```

**Root Cause:**
- Firebase App Hosting uses Application Default Credentials (ADC)
- SERVICE_ACCOUNT_JSON secret referenced but not needed

**Solution:**
Remove from `apphosting.yaml`:
```yaml
# REMOVE THIS:
# - variable: SERVICE_ACCOUNT_JSON
#   secret: SERVICE_ACCOUNT_JSON
```

Update `src/lib/firebase/admin.ts` to use ADC in production:
```typescript
if (!serviceAccountJson) {
  // Uses ADC in Firebase App Hosting
  admin.initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}
```

---

## 🌐 Custom Domain Setup (picksy.au)

### DNS Configuration (Cloudflare)

#### Required Records:
| Type | Name | Value | Proxy |
|------|------|-------|-------|
| A | @ | `35.219.200.5` | DNS only ☁️ |
| TXT | @ | `fah-claim=002-02-7a9096e3-bcf6-46d8-abd7-23a240a5b4e1` | DNS only ☁️ |
| CNAME | `_acme-challenge_s7qib556m5exc4hk` | `4e2fdd39-0f90-4750-b805-d94ef33073c9.2.authorize.certificatemanager.goog.` | DNS only ☁️ |

#### CAA Records (Certificate Authority Authorization):
⚠️ **CRITICAL:** Only these two CAA records should exist:

| Type | Name | Value |
|------|------|-------|
| CAA | @ | `0 issue "letsencrypt.org"` |
| CAA | @ | `0 issue "pki.goog"` |

**Remove any CAA records for:**
- ❌ digicert.com
- ❌ comodoca.com
- ❌ ssl.com
- ❌ Any `issuewild` records

---

## 📊 Deployment Checklist

### Pre-Deployment
- [ ] All code committed and pushed to GitHub main branch
- [ ] No `yarn.lock` file in repository (use npm only)
- [ ] `package.json` build script uses standard `next build`
- [ ] `apphosting.yaml` has all required environment variables
- [ ] Secrets granted access via Firebase CLI
- [ ] DNS records configured in Cloudflare

### During Deployment
- [ ] GitHub push triggers automatic build
- [ ] Cloud Build completes successfully (check console)
- [ ] No Turbopack errors in build logs
- [ ] Firebase backend status shows "Active"
- [ ] New rollout deployed successfully

### Post-Deployment Verification
- [ ] Site loads at Firebase URL
- [ ] ✅ NO "Running in emulator mode" banner
- [ ] ✅ Products load from production Firestore
- [ ] ✅ Console shows "Firebase running in PRODUCTION mode"
- [ ] Search functionality works
- [ ] User authentication works
- [ ] Images load from Cloud Storage
- [ ] AI features functional (if applicable)

### Custom Domain (Optional)
- [ ] CAA records cleaned up (only letsencrypt.org and pki.goog)
- [ ] DNS records added in Cloudflare
- [ ] All records set to "DNS only" (not proxied)
- [ ] Verify records in Firebase console
- [ ] SSL certificate provisioned (15-60 min)
- [ ] Site accessible at custom domain

---

## 🔍 Monitoring & Debugging

### Check Build Status
```bash
# List backends
firebase apphosting:backends:list

# Get backend info
firebase apphosting:backends:get studio --location us-central1

# View logs
firebase apphosting:logs --backend studio --location us-central1
```

### Firebase Console URLs
- **App Hosting Dashboard:** https://console.firebase.google.com/u/0/project/studio-8322868971-8ca89/apphosting
- **Cloud Build History:** https://console.cloud.google.com/cloud-build/builds?project=studio-8322868971-8ca89
- **Secret Manager:** https://console.cloud.google.com/security/secret-manager?project=studio-8322868971-8ca89

### Browser Console Checks
Open browser console on live site and verify:
- ✅ `✅ Firebase running in PRODUCTION mode (emulators disabled)`
- ❌ NO `ERR_CONNECTION_REFUSED` errors
- ❌ NO `localhost:8080` connection attempts

---

## 📝 Deployment History

### January 25, 2026 - Production Deployment

#### Issues Encountered:
1. ✅ **GOOGLE_GENAI_API_KEY secret access** - Resolved with `firebase apphosting:secrets:grantaccess`
2. ✅ **SERVICE_ACCOUNT_JSON misconfiguration** - Removed from apphosting.yaml
3. ✅ **Turbopack symlink errors** - Deleted yarn.lock, forced webpack
4. ✅ **Emulator mode in production** - Added explicit env vars
5. ⏳ **Custom domain SSL** - Pending CAA record cleanup

#### Successful Commits:
- `693355d` - Force webpack + remove yarn.lock to fix Turbopack symlink errors
- `6690851` - Fix production emulator mode issue - explicitly disable emulators
- `fe14bad` - Add turbopack config to fix build error
- `e7af35a` - Fix build: remove --no-turbo flag for App Hosting compatibility
- `85bab40` - Remove SERVICE_ACCOUNT_JSON secret - using ADC in production

---

## 🎓 Lessons Learned

### Build Environment
1. **Use npm only** - Avoid mixing `package-lock.json` and `yarn.lock`
2. **Force webpack** - Turbopack has issues in containerized environments
3. **Test builds locally** - Run `npm run build` before pushing

### Firebase App Hosting
1. **ADC is preferred** - No need for SERVICE_ACCOUNT_JSON in production
2. **Explicit env vars** - Always set `NODE_ENV` and `NEXT_PUBLIC_USE_EMULATORS`
3. **Grant secret access** - New secrets need IAM permissions granted explicitly

### Custom Domains
1. **Clean CAA records** - Extra CAs block SSL issuance
2. **DNS only mode** - Don't proxy Firebase App Hosting domains through Cloudflare
3. **Be patient** - DNS propagation and SSL can take 24-48 hours

---

## 🔐 Security Considerations

### Secrets Management
- ✅ All secrets stored in Google Cloud Secret Manager
- ✅ Backend uses IAM for secret access (no keys in code)
- ✅ Environment variables properly scoped (BUILD/RUNTIME)

### Firebase Rules
- ⚠️ **TODO:** Review and deploy Firestore security rules
- ⚠️ **TODO:** Review and deploy Storage security rules
- ⚠️ **TODO:** Ensure auth rules prevent unauthorized access

---

## 🚧 Next Steps

### Immediate (Before Public Launch)
1. [ ] Clean up CAA records in Cloudflare
2. [ ] Verify custom domain SSL certificate
3. [ ] Test all functionality on production site
4. [ ] Review and deploy security rules
5. [ ] Set up monitoring and error tracking

### Short-term
1. [ ] Configure custom email templates
2. [ ] Set up analytics (already has Google Analytics)
3. [ ] Configure Firestore indexes for performance
4. [ ] Add error logging/monitoring (Sentry, etc.)

### Long-term
1. [ ] Set up staging environment
2. [ ] Implement automated testing
3. [ ] Configure CDN for static assets
4. [ ] Scale Cloud Run instances based on traffic

---

## 📞 Support & Resources

### Documentation
- [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Cloud Build](https://cloud.google.com/build/docs)

### Useful Commands
```bash
# Deploy manually (if needed)
firebase deploy --only apphosting

# View real-time logs
firebase apphosting:logs --backend studio --location us-central1 --tail

# Rollback to previous version
firebase apphosting:rollback --backend studio --location us-central1

# Check domain status
dig picksy.au
dig CAA picksy.au +short
```

---

**Document Maintained By:** AI Assistant (Antigravity)  
**Project:** Picksy - AI-Powered Collectibles Marketplace  
**Last Deployment:** January 25, 2026
