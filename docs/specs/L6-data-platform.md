# L6 - Data platform

## Goals
Trustworthy metrics (listings, conversion, seller retention), pricing intelligence, and decoupled async work.

## Design
- **Firestore -> BigQuery:** Firebase extension "Stream Firestore to BigQuery" for `products`, `orders` (read-only analytics), `users` (PII-minimised view), `reviews`, `saved_searches`, `notifications`; nightly managed export as backup source of truth.
- **GA4 -> BigQuery** daily export (free) for funnel analysis; server-side events for key actions (listing_created, search, save_search, contact_seller) via Measurement Protocol to avoid ad-blocker loss.
- **Modelled tables (dbt or scheduled queries):** `dim_product`, `fct_listing_daily`, `fct_search` (query, results, clicks), `fct_seller_monthly`, `price_history_by_sku_size` (powers market-pulse and pricing suggestions).
- **Event bus:** Pub/Sub topic `domain-events` published by server actions (`product.created/updated`, `order.status_changed`, `message.flagged`); consumers: search indexing (replaces cron polling), notifications, risk scoring (L3). Use Eventarc Firestore triggers where simpler.
- **Seller analytics UI:** views, saves, enquiry rate, sell-through, suggested price band - read from a `seller_stats/{uid}` doc refreshed hourly from BigQuery.

## Privacy
PII columns hashed in analytics datasets; access via groups; data retention 25 months for GA4; APP (Australian Privacy Principles) note in privacy policy.

## Effort
L (3-5 wk). Cost: BigQuery storage/query low at current scale (<$20/mo).
