# Payments: PayID + cash (cards off)

Buyers pay the **seller** directly. Benched never holds money and has no bank integration.

## Flow
1. Checkout (`createOrderAction`) prices the cart server-side (bundles, multibuy, deals), creates one
   order per seller with `paymentMethod: 'payid' | 'cash'`, `status: 'awaiting_payment'`, a reference
   like `BEN-7KQ2XM` and `paymentDueAt` (48h PayID, 72h cash). Sold-out listings become `status: 'reserved'`.
2. **PayID**: only allowed if every seller in the cart has saved a PayID. The seller's PayID is copied
   into `orders/{id}/private/payment` (server-only) and shown to the buyer of that order only, via
   `getOrderPaymentDetails`, with amount + reference copy buttons and a scam warning.
3. **Cash**: Perth local pickup only (pickup delivery + buyer ticks "I'm in Perth and will collect").
4. Seller (or admin) presses **Mark as paid** / **Mark collected** (`order-payments.ts`), which sets the
   order `paid` / `completed` and the reserved listings to `sold`. **Cancel & re-list** releases them.
5. Cron `GET /api/cron/release-unpaid-orders` (Bearer `CRON_SECRET`) cancels unpaid orders past
   `paymentDueAt` and re-lists the items. Buyer and seller get in-app notifications + email (SendGrid).

## Seller PayID
Stored in `users/{uid}/private/payout` `{ payId, payIdType, accountName }`. Rules deny all client access;
only server actions read/write it. The public user doc only gets `payIdReady: true`.
Sellers add it at `/sell/payouts` or on the seller dashboard (Orders tab).

## Stripe
Kept in the code but disabled by `NEXT_PUBLIC_STRIPE_ENABLED` (apphosting.yaml, default `"false"`).

## Deploy
- `firebase deploy --only firestore:rules,firestore:indexes` (private subcollections, `orders(status, paymentDueAt)` index).
- Cloud Scheduler: `*/30 * * * *` GET `https://benched.au/api/cron/release-unpaid-orders` with header `Authorization: Bearer <CRON_SECRET>`.
