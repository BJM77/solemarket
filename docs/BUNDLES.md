# Multi-buy, bundles and deals

Three offer types, one pricing engine (`src/lib/bundles.ts`), used by the cart (CartContext,
CartDrawer) and by `createOrderAction` (via `src/lib/order-pricing.ts`). The server never
trusts any price from the browser.

| Type | Who sets it up | Where | Model |
|---|---|---|---|
| Multibuy tiers | Seller (listing form / wizard), admin templates | `products.multibuyTiers` | % off when buying >= N items from the same seller + category. Capped at 90%. |
| Fixed-price bundles | Seller, `/seller/bundles` | `bundles/{id}` | "Any N of these for $X". Picked listings and/or category / tag rule. |
| Multi-Listing Deals | Admin, `/admin/deals` | `deals/{id}` | Fixed price for a set of bronze/silver/gold/platinum cards. |

## Bundle policy
1. Only eligible items from the bundle's seller count.
2. Eligible units are sorted most expensive first and grouped into sets of N (10 items, N=5 = 2 bundles). Leftovers pay full price (or multibuy tiers).
3. A group is only bundled when the bundle price is cheaper than the items individually.
4. A unit is used by at most one bundle. Bundles with the best per-item price apply first.
5. `maxPerCustomer` is enforced at checkout using `promo_usage/{bundle|deal}_{id}_{buyerId}`. `timesUsed` is incremented in the order transaction.
6. Deal items are validated server-side: deal exists, active, not expired, exact tier counts, qty 1, within maxPerCustomer. The deal price is split across items on the server.

## Deploy
`firebase deploy --only firestore:rules,firestore:indexes` (adds the `bundles` / `promo_usage` rules and the `bundles(isActive, sellerId)` index).
Optional cleanup of old auto-bronze listings with no tiers: `npx tsx scripts/fix-multibuy-no-tiers.ts` (dry run), then `--apply`.
