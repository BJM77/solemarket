# 🔥 Firebase & Secrets Configuration Report
**Project Name:** Picksy Marketplace (Pick1901)  
**Project ID:** `studio-8322868971-8ca89`  
**Date:** 2026-01-30  

---

## 📋 Executive Summary
This report details the complete Firebase infrastructure and secret management for the Picksy marketplace. It is designed to allow developers to replicate the setup for other organizations or troubleshoot the current production environment.

---

## 1. ⚙️ Firebase Project Identity
- **Project ID:** `studio-8322868971-8ca89`
- **Default Region:** `asia-southeast1` (Singapore)
- **Firebase Plan:** Blaze (Pay-as-you-go) - *Required for AI features and Storage.*
- **Production URL:** [picksy.au](https://picksy.au)

---

## 2. 🛡️ Authentication Setup
### **Enabled Providers**
1.  **Email/Password:** Standard login.
2.  **Google Auth:** Configured for seamless onboarding.

### **Super Admin Configuration**
Admins are defined via environment variables and logic in `firestore.rules`.
- **Super Admin UIDs:** `O5nCLgbIaRRRF369K0kjgT59io73`
- **Super Admin Emails:** `1@1.com`
- **Logic:** `isSuperAdmin()` function in Firestore rules checks if the UID matches the authorized list or if the user has a custom claim `{ role: 'superadmin' }`.

---

## 3. 📄 Firestore Database
### **Core Collections**
- `products`: Listings with price, sellerId, imageUrls, condition, and metadata.
- `users`: User profiles, public info, and internal subcollections.
- `categories`: Global category definitions (Admin only).
- `orders`: Transaction records between buyers and sellers.
- `conversations`: Messaging threads between users.
- `platform_stats`: Global counters for the homepage (e.g., total items, total sales).
- `enquiries`: Contact form submissions.

### **Security Rules (Key Logic)**
- **Products:** Public read. Create requires authentication + matching `sellerId`. Update/Delete requires owner or Super Admin.
- **Admin Collections:** `categories`, `platform_stats`, and `settings` are writeable **ONLY** by Super Admins.
- **Private Data:** `notifications` and `orders` are restricted to participants.

### **Indexes**
Critical indexes are deployed for:
- Sorting products by `price` (ASC/DESC).
- Filtering products by `status` + `createdAt`.
- Collection Group queries for localized searches.

---

## 4. 📦 Cloud Storage
### **Folder Structure**
- `/products/{userId}/{productId}/`: Publicly viewable product images.
- `/verification-docs/{userId}/`: Private verification IDs (Owner/Admin only).
- `/temp-analysis/{userId}/`: Transient files used for AI scanning.
- `/media-library/`: Global UI assets.

### **CORS Configuration**
Current `storage.cors.json` allows all origins (`*`) for cross-site uploads and image fetching.  
**To apply:** `gsutil cors set storage.cors.json gs://studio-8322868971-8ca89.firebasestorage.app`

---

## 5. 🔑 Secrets & Environment Variables
The application requires these secrets to be set in the production environment (Vercel, Firebase App Hosting, or `.env.local`).

| Variable Name | Purpose | Source |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Public Firebase SDK Key | Firebase Console > Project Settings |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Main Project Identifier | Firebase Console |
| `GEMINI_API_KEY` | Google Gemini AI Features | [Google AI Studio](https://aistudio.google.com/) |
| `SERVICE_ACCOUNT_JSON` | Firebase Admin SDK Auth | GCP Console > IAM > Service Accounts |
| `SUPER_ADMIN_UIDS` | List of Admin UIDs | Firebase Auth Console |

### **Firebase Admin SDK (Production)**
The project uses a Service Account for server-side actions (like deleting users or modifying stats).  
**Configuration Path:** `src/lib/firebase/admin.ts`  
It checks `SERVICE_ACCOUNT_JSON` first, then falls back to `GOOGLE_APPLICATION_CREDENTIALS`.

---

## 6. 🚀 Replication Guide (Step-by-Step)
To replicate this site for a new company:

1.  **Create Firebase Project:**
    - Go to [Firebase Console](https://console.firebase.google.com/).
    - Enable **Firestore**, **Storage**, **Authentication**, and **Hosting**.
2.  **Set Up Auth:**
    - Enable Email/Password and Google sign-in.
3.  **Deploy Infrastructure:**
    - Copy `firestore.rules`, `storage.rules`, and `firestore.indexes.json`.
    - Run: `firebase deploy`.
4.  **Configure Storage CORS:**
    - Apply `storage.cors.json` using `gsutil`.
5.  **Generate Service Account:**
    - Go to Project Settings > Service Accounts > Generate New Private Key.
    - Convert the JSON to a single string and add to `SERVICE_ACCOUNT_JSON` env var.
6.  **AI Setup:**
    - Create a Gemini API Key at Google AI Studio.
7.  **Environment Variables:**
    - Clone `.env.example` to `.env.local` and populate with the new project's keys.

---

## 7. 🛠️ Essential CLI Commands
```bash
# Register a new site
firebase target:apply hosting main your-site-id

# Deploy specific parts
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
firebase deploy --only hosting

# Grant Admin Status (Custom Script)
node scripts/grant-admin.js <user-email>
```

---
**Report generated for:** Picksy Team  
**Confidentiality:** Internally Shared / Setup Guide
