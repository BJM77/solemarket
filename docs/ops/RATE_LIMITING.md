# Rate limiting

`src/lib/rate-limit-guard.ts` provides two tiers:

1. **In-memory sliding window** per server instance (always on; zero cost).
2. **Firestore-backed global limiter** (`src/lib/rate-limiter.ts`) when `persistent: true` - used for expensive actions.

| Action | Key | Limit | Tier | Where |
|---|---|---|---|---|
| All AI/vision flows (`ai`) | IP | 60 / 10 min | memory + Firestore | every exported flow in `src/ai/flows/*` that hits Gemini |
| Create listing | uid | 20 / h | Firestore | `src/app/actions/marketplace/products.ts` (pre-existing) |
| Expert enquiry | IP | 5 / 10 min | memory | `actions/marketplace/enquiries.ts#submitEnquiry` |
| Guest enquiry | IP | 5 / 10 min | memory | `actions/seller/enquiry-actions.ts#sendGuestEnquiry` |
| Newsletter | IP | 5 / h | memory | `actions/marketplace/newsletter.ts` |
| WTB create / contact | IP | 10 / h, 20 / h | memory | `actions/marketplace/wtb.ts` |
| Client error log | IP | 20 / min | memory | `api/log-error` (was an open Firestore write) |

Out of scope for this phase (payments): bids/offers, checkout.

## Edge protection (recommended, needs account)
Put Cloud Armor (or Cloudflare in front of App Hosting) with a per-IP rate rule of ~300 req/min and bot management; this stops floods before they cost Cloud Run CPU.
