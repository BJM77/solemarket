# Phase B features

| Feature | Where | Notes |
|---|---|---|
| Search adapter (Typesense/Algolia, Firestore fallback) | `src/lib/search/*`, `src/app/actions/search/search.ts`, `/api/cron/search-sync` | Off until keys are set - see `docs/search/SEARCH.md` |
| Listing wizard | `/sell/wizard`, `src/components/sell/wizard/ListingWizard.tsx`, `src/lib/listing-wizard/steps.ts` | Category -> guided shots (required angles) -> details (optional AI fill) -> price -> review. Draft autosaves (incl. uploaded photo URLs). Mobile bottom-nav "Sell" now opens it; full form still at `/sell/create`. |
| Verified reviews | `src/app/actions/reviews/verified-reviews.ts`, `src/components/reviews/ReviewForm.tsx` | Only buyers with a `delivered`/`completed` order containing the item; one review per order line (deterministic id); seller `sellerRating`/`reviewCount` updated transactionally; reviews containing off-platform contact go to admin-only `reviews_pending`. Fixes the old form, which wrote to `reviews` from the client and was blocked by `firestore.rules`. |
| Saved searches & alerts | "Save search" on browse, `/profile/saved-searches`, `src/app/actions/saved-search/*`, `/api/cron/saved-search-alerts` | Stored in `users/{uid}/saved_searches` (owner read/delete only). Cron writes one digest notification per matching search into `notifications`. Needs a Scheduler job (every 15 min) + the new index (`firebase deploy --only firestore:indexes`). |
| Off-platform detection | `src/lib/messaging/off-platform.ts` | Phone (incl. spelled-out digits), email (incl. "at/dot"), PayID/BSB, PayPal F&F/crypto/gift cards, WhatsApp/Telegram, links, social handles. Live warning in chat, contact details masked, message flagged `needsReview`; also applied to guest enquiries, WTB messages and reviews. Client-side check in chat is advisory - see note below. |
| Seller onboarding UX | `/sell/onboarding`, compact card on `/sell/dashboard`, `src/lib/seller-onboarding/checklist.ts` | Account type, store profile, contact, agreement, approval, first listing; "Set up payouts" shown as Coming soon (payments phase). |

**Follow-ups:** move chat sends to a server action (or Firestore trigger) so off-platform checks can't be bypassed by a modified client; admin queue UI for `reviews_pending` and `needsReview` messages; facet counts in the filter sidebar.
