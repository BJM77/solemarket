# 🔐 Firebase Secrets Setup Guide

This guide will help you securely store your Firebase Service Account credentials in production.

---

## 📋 **What You Need**

From your `.env.local` file:
- `FIREBASE_SERVICE_ACCOUNT_JSON` value
- `GOOGLE_GENAI_API_KEY` value (for AI features)

---

## 🚀 **Step-by-Step Instructions**

### **Step 1: Set Up Firebase Service Account Secret**

```bash
cd /Users/bjm/Desktop/Pick1901

# Set the service account JSON as a secret
firebase functions:secrets:set FIREBASE_SERVICE_ACCOUNT_JSON
```

**When prompted:**
1. Press Enter
2. Paste your entire service account JSON (from `.env.local`)
3. Press Ctrl+D (Mac) or Ctrl+Z (Windows) to finish
4. Confirm with 'y'

**Example:**
```
? Enter a value for FIREBASE_SERVICE_ACCOUNT_JSON: 
{"type":"service_account","project_id":"studio-8322868971-8ca89",...}
^D
? Grant services.cloudfunctions.net access to the secret? Yes
```

---

### **Step 2: Set Up Google AI API Key Secret**

```bash
firebase functions:secrets:set GOOGLE_GENAI_API_KEY
```

**When prompted:**
1. Press Enter
2. Paste your Google AI API key
3. Press Ctrl+D to finish

---

### **Step 3: Update Your Code to Use Secrets**

The secrets are automatically available as environment variables in Firebase Functions:
- `process.env.FIREBASE_SERVICE_ACCOUNT_JSON`
- `process.env.GOOGLE_GENAI_API_KEY`

**Your code already references these!** No changes needed.

---

### **Step 4: Deploy with Secrets**

```bash
# Deploy your functions with the secrets
firebase deploy --only functions,hosting
```

Firebase will automatically:
- ✅ Inject the secrets into your Cloud Functions
- ✅ Keep them encrypted and secure
- ✅ Only make them available to your functions

---

## 🔍 **Verify Secrets Are Set**

```bash
# List all secrets
firebase functions:secrets:list
```

You should see:
```
┌────────────────────────────────┬─────────┐
│ Secret                         │ Version │
├────────────────────────────────┼─────────┤
│ FIREBASE_SERVICE_ACCOUNT_JSON  │ 1       │
│ GOOGLE_GENAI_API_KEY          │ 1       │
└────────────────────────────────┴─────────┘
```

---

## 🔄 **Update a Secret**

If you need to change a secret:

```bash
# Access the secret (shows versions)
firebase functions:secrets:access FIREBASE_SERVICE_ACCOUNT_JSON

# Set a new version
firebase functions:secrets:set FIREBASE_SERVICE_ACCOUNT_JSON
```

---

## 🗑️ **Delete a Secret**

```bash
firebase functions:secrets:destroy FIREBASE_SERVICE_ACCOUNT_JSON
```

---

## ⚙️ **Alternative: Firebase Functions Config (Legacy)**

If you prefer the older method:

```bash
# Set service account (needs to be base64 encoded for JSON)
firebase functions:config:set \
  firebase.service_account="$(cat your-service-account.json | base64)"

# Set AI key
firebase functions:config:set genai.api_key="YOUR_KEY"

# View config
firebase functions:config:get

# Deploy
firebase deploy --only functions
```

**Access in code:**
```javascript
const serviceAccount = JSON.parse(
  Buffer.from(functions.config().firebase.service_account, 'base64').toString()
);
```

---

## 🎯 **Why Use Secrets Manager?**

✅ **More Secure**: Encrypted at rest and in transit  
✅ **Version Control**: Track secret versions  
✅ **Access Control**: Fine-grained IAM permissions  
✅ **Audit Logs**: See who accessed what  
✅ **Automatic Rotation**: Update without redeploying  

**Firebase Functions Config** is simpler but less secure.

---

## 🐛 **Troubleshooting**

### **Error: "Secret not found"**
```bash
# Make sure you're in the right project
firebase use studio-8322868971-8ca89

# List secrets to verify
firebase functions:secrets:list
```

### **Error: "Permission denied"**
```bash
# Login again
firebase login

# Make sure you're an owner/editor of the project
```

### **Secret Not Available in Function**
```bash
# Redeploy after setting secrets
firebase deploy --only functions

# Check logs
firebase functions:log
```

---

## 📝 **Quick Reference**

```bash
# Set a secret
firebase functions:secrets:set SECRET_NAME

# List all secrets
firebase functions:secrets:list

# View secret value
firebase functions:secrets:access SECRET_NAME

# Delete a secret
firebase functions:secrets:destroy SECRET_NAME

# Deploy with secrets
firebase deploy --only functions
```

---

## ✅ **After Setup**

Your production environment will have:
- ✅ Secure access to Firebase Admin SDK
- ✅ AI features working with Google Genai
- ✅ No 500 errors on admin pages
- ✅ Platform stats loading correctly

**Test by visiting:** https://studio-8322868971-8ca89.web.app/admin

---

*Created: 2026-01-23*
