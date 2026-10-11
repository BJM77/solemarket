# Search (adapter: Typesense / Algolia, Firestore fallback)

The browse page and grid call `src/lib/search` (`searchProducts`). With no provider configured
(today), it uses the existing Firestore query path, so **nothing changes until keys are added**.
If the external engine errors or times out (4 s), requests fall back to Firestore automatically
and the failure is reported to Sentry (`area:search`).

Results from the engine are hydrated from Firestore by id and anything not `available` is dropped,
so a lagging index can never show sold/deleted items.

## Choose one provider

### Option A - Typesense Cloud (recommended: cheaper, typo-tolerant, faceting, AU region)
1. Create a cluster at cloud.typesense.org (region: Sydney).
2. Create the collection once (schema in `src/lib/search/typesense.ts#TYPESENSE_SCHEMA`):
   Paste the `TYPESENSE_SCHEMA` object from `src/lib/search/typesense.ts` into the Typesense dashboard
   (Collections > Create), or `POST /collections` with it using the admin key.
3. Create a **search-only** key scoped to the `products` collection.
4. Secrets (App Hosting, runtime):
   | Variable | Secret? | Value |
   |---|---|---|
   | `SEARCH_PROVIDER` | no | `typesense` |
   | `TYPESENSE_HOST` | no | `xxx.a1.typesense.net` |
   | `TYPESENSE_PROTOCOL` / `TYPESENSE_PORT` | no | `https` / `443` (defaults) |
   | `TYPESENSE_SEARCH_API_KEY` | yes | search-only key |
   | `TYPESENSE_ADMIN_API_KEY` | yes | admin key (indexing only) |

### Option B - Algolia
1. Create an app + index `products`. Searchable attributes: `title, brand, manufacturer, keywords, description`.
   Attributes for faceting: `category, brand, condition, size, status, isVerified, manufacturer, subCategory` (filterOnly for `status`).
   Replicas for sorting: `products_price_asc` (asc(price)), `products_price_desc` (desc(price)), `products_newest` (desc(createdAt)).
2. Secrets: `SEARCH_PROVIDER=algolia`, `ALGOLIA_APP_ID`, `ALGOLIA_SEARCH_API_KEY` (secret), `ALGOLIA_ADMIN_API_KEY` (secret), optional `ALGOLIA_INDEX`.

## Keeping the index in sync
- New listings are pushed immediately from `createProductAction` (best effort).
- Every other change (edits, price drops, sold, deleted, admin actions) is picked up by
  `GET /api/cron/search-sync` which upserts products with `updatedAt` in the last 10 minutes.
  Create a Cloud Scheduler job every 5 minutes with header `Authorization: Bearer <CRON_SECRET>`.
- **Initial backfill:** call once with `?minutes=525600`.

## Facets
The adapter returns facet counts (`category, brand, condition, size`) on `SearchResult.facets`
for the filter UI to show counts next to each option (UI wiring is a follow-up).
