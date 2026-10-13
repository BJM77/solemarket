# L3 - Fraud & moderation

## Goal
Stop counterfeit listings, account takeovers and off-platform scams before they reach buyers, with a reviewable queue instead of silent blocks.

## Building blocks already in repo
`src/ai/flows/detect-fraud.ts`, `ai-content-moderation.ts`, `admin/fraud-detection`, `admin/moderation`, Phase B `off-platform.ts` flags (`needsReview`), rate limiter.

## Scope
1. **Risk score service** `src/lib/risk/score.ts` (pure, testable) combining signals into 0-100 with reasons:
   - Account: age, email domain/disposable, phone verified, prior rejections, device/IP velocity (signups per IP/24 h), country mismatch.
   - Listing: price vs market (market-pulse median; < 40% = high), stock photos (reverse-image hash match against known catalogue), AI counterfeit hints, duplicate photos across sellers (perceptual hash), off-platform text.
   - Messaging: off-platform flag rate, many new conversations in short time.
2. **Actions by score:** < 30 auto-publish; 30-70 publish + post-moderation queue; > 70 hold (`pending_approval`) + queue; repeated > 70 -> account restricted (cannot list/message) pending review.
3. **Queues UI** (single moderation inbox): listings, messages, reviews_pending, reports; bulk approve/reject with reason codes; reason shown to user.
4. **User reporting:** "Report listing / user / message" with reason; 3 independent reports auto-hold.
5. **Perceptual hashing** on upload (pHash of 400px variant) stored on product; nightly job finds cross-seller duplicates.

## Data model
`risk_events/{id}` (subject, type, score, reasons[], createdAt), `moderation_items/{id}` (kind, refPath, score, status, assignedTo, decision, reasonCode), `reports/{id}`, `users.restrictions {listing, messaging, until}`.

## Security
Moderator custom claim; restricted users enforced in rules (`!('restrictions' in user) || ...`) and server actions.

## Metrics
Counterfeit claim rate, % listings auto-published, moderator queue age P90 < 12 h, false-positive rate (appeals upheld).

## Effort
L: scoring + signals 2 wk, hashing + duplicate job 1 wk, unified queue 2 wk, reporting 0.5 wk.

## Open questions
Device fingerprinting vendor (FingerprintJS) vs first-party; appeal SLA.
