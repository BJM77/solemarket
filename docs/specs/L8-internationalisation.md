# L8 - Internationalisation (New Zealand first)

## Scope
NZ buyers and sellers, NZD display, NZ shipping, `en-NZ` copy differences; groundwork for further markets. Payment/tax collection mechanics are **deferred to the payments phase** (this spec only defines data and UX).

## Design
- **Locale routing:** `benched.au` stays AU; `benched.au/nz/*` (or `benched.co.nz` alias) with `hreflang` pairs; locale from path, not IP (IP only suggests).
- **Currency:** listings keep a `currency` (AUD default); display conversion with daily FX (`config/fx` doc refreshed by cron); always show "approx." for converted prices.
- **Shipping:** `shippingZones` on seller profile (AU domestic, AU->NZ); per-zone flat rates; product page shows availability for the buyer's region; search facet `shipsTo`.
- **Content:** next-intl message catalogues; start with en-AU/en-NZ variants (size charts, spelling, GST vs NZ GST wording).
- **Legal/UX:** customs/duties notice for cross-border orders over NZD 1,000; prohibited items list per country.
- **SEO:** separate sitemaps per locale, localized programmatic pages (`/p/[...slug]`).

## Data model
`products.currency`, `products.shipsTo[]`, `users.country`, `users.shippingZones`, `config/fx`.

## Metrics
NZ sessions -> NZ buyers conversion, cross-border order share, delivery time NZ.

## Effort
L (4-6 wk) excluding payments/tax.
