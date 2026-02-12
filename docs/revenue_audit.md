# Picksy.au CEO Report: Revenue Leakage & Business Model Audit
**Date:** February 11, 2026
**Prepared by:** Gemini (CEO)

## 1. Executive Summary

Our current business model relies on a classic **Transaction Fee** (5-10% of sale price) + a **Service Fee** ($49.95 for DealSafe Escrow).

**The Diagnosis:** We have a massive "hole in the bucket."
Technically, our code allows buyers and sellers to connect, but the payment capture logic is incomplete, and worse, our UX in places *encourages* off-platform settlements (e.g., "Cash on Delivery" or manual bank transfers).

If we launch today, users will use Picksy to find each other, then meet on Facebook/PayID to save the 10%. We become a free lead generation service for our competitors.

---

## 2. The Leakage Points (Critical Issues)

### A. The "Gentleman's Agreement" Flaw
In `src/app/actions/bidding.ts`, when a seller accepts a bid, we mark the item as `sold`.
**The Problem:** We do *not* automatically charge the buyer's card. We rely on the buyer coming back to "complete checkout" or the seller manually marking it as paid.
**The Fix:** We must implement **"Binding Offers."**
*   Buyers *must* pre-authorize their credit card (via Stripe SetupIntent) to place a bid.
*   When a seller clicks "Accept," the card is charged *instantly*. The fee is deducted automatically by Stripe Connect before the seller gets paid.

### B. The "Escrow" Loophole
Our unique value proposition is **DealSafe** (Authentication + Escrow).
**The Problem:** Currently, this is an optional add-on. If users trust each other (or think they do), they will bypass it to save the $49.95 fee.
**The Fix:**
1.  **Mandatory Tier:** For items >$500, DealSafe should be *mandatory*. The risk of fraud is too high, and enforcing it builds our reputation as the "safe" place.
2.  **Visual "Verified" Lock:** Buyers should *want* to pay the fee. We need to badge DealSafe items as "Guaranteed Authentic" so the fee feels like insurance, not a tax.

### C. The "Cash on Delivery" Leak
Our checkout flow (`src/app/checkout/page.tsx`) seemingly supports manual payment methods.
**The Problem:** "Cash on Delivery" or "Bank Transfer" means 0% fee for us. We cannot enforce a commission if the money doesn't touch our Stripe account.
**The Fix:** Disable "Manual Payments" for the beta. All transactions must go through Stripe.

---

## 3. Strategic Pivot: "The 3-Layer Monetization Stack"

To fix the revenue model, I propose moving from a simple "Taxman" model to a "Value-Add" model.

### Layer 1: The Transaction (Automated & Binding)
*   **Action:** Implement Stripe "Binding Bids" immediately.
*   **Revenue:** 5-10% Success Fee.
*   **Why:** Locks in revenue at the moment of agreement. No "ghosting."

### Layer 2: The Service (DealSafe)
*   **Action:** Pivot DealSafe from "Escrow" to "Authentication".
*   **Revenue:** $30 - $50 flat fee per item.
*   **Why:** People hate paying fees, but they *love* paying for "Peace of Mind." Rebrand the fee as "Authentication Service."

### Layer 3: The Subscription (Pro Tools) -> **NEW**
*   **Action:** Introduce **"Picksy Pro" ($15/mo)**.
*   **Revenue:** Recurring Monthly Recurring Revenue (MRR).
*   **Value:**
    *   Unlimited AI Scans (Free tier capped at 50).
    *   "Price Alerts" (Get notified when a Charizard hits the market under $200).
    *   Lower Seller Fees (5% instead of 10%).
*   **Why:** This incentivizes high-volume sellers to stay on the platform. If they pay a sub, they *want* to sell here to get their money's worth.

---

## 4. CEO Action Plan

1.  **Immediate Code Fix:** I will now "plug the hole" by removing manual payment options (Cash/Bank Transfer) from the UI for the soft launch. We force digital payments to verify the model.
2.  **Binding Bids Implementation:** I will scaffold the architecture for pre-authorized bids. This is complex but necessary for a modern auction site (like StockX/eBay).
3.  **Subscription Roadmap:** I will add a `isProMember` flag to the user schema to prepare for the subscription model.

**Shall I proceed with step 1: Disabling manual payments to stop the immediate leakage?**
