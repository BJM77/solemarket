# Image pipeline

- **Root cause of 15 MB pages:** Firebase App Hosting sets `images.unoptimized=true` unless `next.config.js` explicitly sets `false`. Every `<Image>` therefore shipped the raw 2-3 MB Storage original. `next.config.js` now sets `images.unoptimized: false`, AVIF/WebP formats and a 30-day optimiser cache.
- **Upload:** `src/lib/firebase/storage.ts#uploadImages` now re-encodes every product photo in the browser to a WebP master (max 2048 px, ~1.5 MB cap) and uploads `-w400.webp` and `-w1000.webp` renditions alongside, all with `Cache-Control: public, max-age=31536000, immutable`. Renditions are best-effort and never block a listing. Path helpers: `src/lib/images/variants.ts`.
- **Delivery:** `next/image` serves AVIF/WebP at the rendered width; first 4 cards on grids use `priority` (no lazy LCP).
- **Existing photos:** old originals are still large but are now resized by the optimiser on request. Optional backfill: a one-off script to generate renditions for existing `products/**` objects (not included; needs Storage admin access).
- **Cost note:** the optimiser runs on the App Hosting instance (sharp). With `minInstances: 1` and 2 GiB memory this is fine at current traffic; at scale consider Firebase's Image CDN / Cloudinary via a custom `loaderFile`.
