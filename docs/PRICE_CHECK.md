# Price Check (price verification)

Where it appears:
- **/admin/price-check**: the ad-hoc price tool, plus a **pricing report** that scans the 100 newest available listings. It flags listings priced more than 25% below market (profit leakage) or more than 40% above market (unlikely to sell). The report is saved to `price_reports/latest`.
- **/seller/price-check**: the same tool for sellers. It is linked from the seller dashboard.
- **Inline "Check market price"**: shown under the price field in the listing wizard (create) and in ListingForm (edit). It shows the low/median/high range and the comps with links, warns "Priced X% below market", and offers a "Use median" button.

## Sources (adapters in `src/lib/price-intel/providers`)
| Source | Needs | Notes |
|---|---|---|
| Benched sold prices | nothing | Paid or completed orders on Benched |
| eBay AU (Browse API) | `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET` (production keyset), `EBAY_ENV=production` | Returns **active** listings only, and these are down-weighted ×0.9. Sold comps need Marketplace Insights API access from eBay; once approved, set `EBAY_INSIGHTS_ENABLED=true`. |
| pokemontcg.io | optional `POKEMONTCG_API_KEY` (free, raises rate limits) | TCGplayer USD market prices and Cardmarket EUR trend prices for Pokemon cards |
| PriceCharting | optional `PRICECHARTING_API_TOKEN` (paid) | Cards and graded prices |

A provider with no key is skipped, and the results show it as "off". StockX and GOAT are not scraped. Note: `src/lib/ebay-scraper.ts` is a legacy HTML scraper that this feature doesn't use. It is probably against eBay's terms of service and should be removed.

Other settings: `PRICE_FX_USD_AUD` (default 1.52), `PRICE_FX_EUR_AUD` (1.65) and `PRICE_FX_GBP_AUD` (1.95) set the conversion rates. `PRICE_CHECK_TTL_HOURS` (default 24) sets how long results are cached in `price_checks/{key}`. Both price collections are server-only: the Firestore rules deny all client access.

Rate limit: 30 checks per user per 10 minutes. The report is admin-only.
