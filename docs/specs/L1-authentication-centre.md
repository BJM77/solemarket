# L1 - Verified by Benched (authentication centre)

## Goal
Give buyers GOAT/StockX-level confidence on high-value sneakers and slabs without forcing every item through a warehouse.

## Scope
- **Tier 1 - Photo authentication (all listings, opt-in by seller):** required angles from the listing wizard (size tag, insole, stitching, box label) reviewed by an authenticator in an internal queue, assisted by the existing AI flows (`deep-scan-shoe`, `deep-scan-card`). Result: `authStatus = verified | rejected | needs_photos`, badge on card/product.
- **Tier 2 - Ship-to-verify (items over a threshold, e.g. $500):** seller ships to Benched hub, physical check, tamper tag applied, then forwarded. Operational workflow only in this spec; any fee is deferred to the payments phase.
- **Vault passport** (`src/app/vault/passport`) becomes the public proof page: cert id, photos at check, authenticator id (pseudonymous), tag number, chain of custody events.

Non-goals: insurance, fees, payouts, cross-border.

## User stories
- Buyer filters "Verified only" and sees the badge + passport link.
- Seller requests verification from the listing wizard review step; gets "needs photos" with exact shots missing.
- Authenticator works a queue sorted by value/age, with side-by-side reference images per SKU and an AI risk hint.

## Data model
- `auth_requests/{id}`: productId, sellerId, tier, status (`queued|in_review|needs_photos|verified|rejected|in_transit|received|shipped_out`), assignedTo, checklist `{item: pass|fail|na}`, aiRisk 0-1, notes (internal), timestamps.
- `auth_certificates/{certId}`: productId, requestId, tagNumber, photos[], verifiedAt, authenticatorCode, revoked flag.
- `products.authStatus`, `products.certId` (denormalised for search facet `isVerified`).
- `sku_references/{styleCode}`: reference photos, known fake tells.

## APIs / actions
`requestAuthentication(idToken, productId, tier)`, `claimAuthRequest`, `submitAuthDecision`, `revokeCertificate` (admin). Every decision writes `activity_logs`.

## Security
Authenticator role via custom claim `authenticator`; rules: queue readable only by `authenticator|admin`; certificates public read, server write only. Photos for auth stored under `auth/{requestId}/` (private).

## Rollout
1. Internal queue + Tier 1 for sneakers > $250 (2 authenticators). 2. Cards (slab check via cert lookup APIs - PSA/BGS). 3. Tier 2 hub pilot in one city.

## Metrics
Verified share of GMV, time-to-decision (P50 < 4 h), post-sale "not authentic" claims per 1,000 verified orders (target < 1), conversion uplift of verified vs unverified.

## Effort
XL: queue UI 2 wk, data/rules/actions 1 wk, passport 1 wk, reference library 1-2 wk, hub ops tooling 2-3 wk.

## Open questions
Liability wording; hub location/partner; whether AI-only "pre-check" badge is allowed (recommend no - human only).
