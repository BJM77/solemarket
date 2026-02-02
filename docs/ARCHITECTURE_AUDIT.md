# 🏗️ Picksy Marketplace - Architectural & Security Audit

**Date:** January 23, 2026  
**Auditor:** Application Architect (AI)  
**Status:** Critical Issues Detected & Fixes Proposed

---

## 🚨 Executive Summary

The application is built on a modern stack (Next.js 16 + Firebase + Genkit), which is excellent. However, there are **3 Critical Critical Architecture Flaws** currently causing instability (500 errors) and limiting scalability. 

The primary cause of the "Auto-Fill" crashes is likely the **Server Action Payload Limit** or **Genkit Storage Access** issue.

---

## 🛑 Critical Issues (Must Fix Immediatey)

### 1. Server Action Payload Size Limit (Likely Cause of 500 Errors)
**The Problem:** Default Next.js Server Actions have a **1MB body size limit**. High-quality card images (converted to Base64) often exceed 4MB+. When you send this to the `gradeCardDetailsAction`, the server rejects it immediately with a 500 or Connection Reset error.
**The Fix:** 
1. Client uploads image to Firebase Storage (CORS now fixed ✅).
2. Client passes only the **Public Download URL** to the Server Action.

### 2. Hybrid SDK Pattern (Stability Risk)
**The Problem:** Files like `src/lib/firebase/firestore.ts` are marked `'use server'` but use the **Client SDK** (`firebase/firestore`).  
**Why it breaks:** The Client SDK depends on browser APIs (WebSockets/IndexedDB). In a serverless environment (Cloud Functions), it behaves unpredictably and lacks proper authentication context (it sees itself as an unauthenticated guest).
**The Fix:** Strictly use `firebase-admin` (Admin SDK) in all `src/app/actions/*` files.

### 3. Unprotected AI Endpoints (Security Risk)
**The Problem:** `gradeCardDetailsAction` accepts an `idToken` but **never verifies it**.
**Risk:** A malicious user could curl your API endpoint and drain your Gemini API quota without being logged in.

### 4. `deploy.sh` Destructive Behavior
**The Problem:** The script runs `rm -rf package-lock.json`.
**Risk:** This guarantees that your production dependencies are **never the same** as your local ones. A standard package update could break production silently.

---

## 💡 Code Solutions & Recommendations

### ✅ Fix 1: Secure & Robust Server Action Pattern

Refactor your actions to verify auth and use the Admin SDK.

```typescript
// src/app/actions/ai-secure.ts
'use server';

import { verifyIdToken } from '@/lib/firebase/auth-admin'; // Admin SDK
import { gradeCardDetails } from '@/ai/flows/grade-card-details';

export async function secureGradeAction(input: { imageUrl: string, idToken: string }) {
  try {
    // 1. Verify User (Security)
    const decoded = await verifyIdToken(input.idToken);
    
    // 2. Call AI Flow with URL (Performance)
    // Note: Ensure your Genkit prompt treats 'imageUrl' as a media URL
    return await gradeCardDetails({ 
        frontImage: input.imageUrl // Pass URL, not Base64!
    });
    
  } catch (error) {
    console.error("AI Action Failed:", error);
    throw new Error("Grading failed. Please try a smaller image.");
  }
}
```

### ✅ Fix 2: Proper Middleware (Protection at the Edge)

Create `src/middleware.ts` to stop non-admins from even loading the admin dashboard code.

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isAuth = request.cookies.has('__session'); // Or custom token logic
  
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!isAuth) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }
  }
  return NextResponse.next();
}
```

### ✅ Fix 3: Image Optimization

You are using standard `<img>` tags. Switch to `next/image` for automatic resizing, lazy loading, and format conversion.

```tsx
// Change this:
<img src={product.image} className="w-full h-full object-cover" />

// To this:
import Image from 'next/image';
<div className="relative w-full h-64">
  <Image 
    src={product.image} 
    fill 
    alt={product.name}
    className="object-cover"
    sizes="(max-width: 768px) 100vw, 33vw"
  />
</div>
```

---

## 🔍 Specific Bug Findings

1. **Firestore Rules Conflict:**
   In `firestore.rules`, you define `match /platform_stats/{statId}` **twice**. This can cause unpredictable access behavior.
   
2. **Genkit Config:**
   We fixed the API Key issue (`GOOGLE_GENAI_API_KEY`), but ensure your Cloud Function has internet access to fetch images if you switch to URLs.

---

## 🏁 Action Plan (Recommended)

1. **Upload, Don't Stream:** Modify your `EnhancedAICardGrader` to upload the image to Firebase Storage first (you just fixed the CORS for this!).
2. **Pass URL:** Pass the `downloadURL` to the AI action instead of the base64 string.
3. **Refactor Ops:** Remove `rm -rf package-lock.json` from `deploy.sh`.
4. **Secure Actions:** Add `verifyIdToken` to the top of `gradeCardDetailsAction`.

This architecture will stop the 500 errors and ensure the site can handle real-world traffic.
