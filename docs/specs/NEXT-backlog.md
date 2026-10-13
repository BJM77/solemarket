# NEXT items not built in Phase B (specs)

## X2 - Cursor pagination, indexes, CLS
- Audit every `getDocs` on `products`: require `limit` + `startAfter` cursor; remove `getCountFromServer` from hot paths (use `active-listings-count` cached aggregate).
- Declare all composite indexes in `firestore.indexes.json`; add a CI check that runs the app's query builder against the emulator and fails on "requires an index".
- CLS: fixed aspect-ratio wrappers on cards (already `aspect-*` in grid; ensure skeletons match), reserve hero/banner heights. Target CLS < 0.05 (desktop /browse was 0.255 live).
- Effort: M (1 wk).

## X10 - Seller dashboard (mobile-first)
- Single `/sell/dashboard` (merge `/seller/dashboard`): tabs To ship / Active / Drafts / Sold / Insights.
- Cards with one primary action each (Print label, Mark shipped, Edit price). Server-side counts (views, saves, enquiries) from `seller_stats` (L6) to respect tightened rules.
- Bulk reprice with preview; listing health hints (missing required photos, stale > 30 d).
- Effort: M (2 wk). Payout timeline waits for payments phase.

## X11 - Navigation & touch targets
- Bottom nav: Home, Browse, Sell (wizard), Inbox (unread badge), Profile - "Activity" currently points to orders; replace with Inbox.
- Product page: sticky bottom bar on mobile with price + primary CTA + Make offer; 44x44 targets everywhere (Playwright check exists for bottom nav - extend to product page).
- Desktop: mega-menu for categories/brands, breadcrumb on product/browse.
- Mobile filters as a bottom sheet with live result count (uses search facets).
- Effort: M (1 wk).

## X12 - Forms
- Standardise on `Form` + zod with inline errors, `autocomplete` (`name`, `email`, `tel`, `street-address`, `postal-code`), `inputmode` for numbers/phones, AU address autocomplete (Google Places or Addressfinder), persistent drafts (pattern from wizard).
- Effort: S (3 d).

## X13 - Third-party & JS weight
- Load GA4/Meta Pixel with `next/script strategy="lazyOnload"` after consent; consent banner (also needed for privacy).
- Ensure `@tanstack/react-query-devtools` is dev-only; `next build --analyze` (add `@next/bundle-analyzer`), split heavy client components (`ProductCard` 900+ lines, `InfiniteProductGrid` 800+ lines) and lazy-load admin-only branches (bulk edit, CSV export) so buyers don't download them.
- Target TBT < 200 ms on mid-tier mobile (local Lighthouse TBT is ~520-730 ms; it's JS-bound).
- Effort: M (1 wk).
