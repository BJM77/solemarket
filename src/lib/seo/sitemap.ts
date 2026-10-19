/**
 * Helpers for src/app/sitemap.ts.
 *
 * Next 15 passes the generateSitemaps id to the sitemap function as a string
 * ("0"), even though generateSitemaps returned numbers. Comparing it with
 * `id === 0` was always false, so /sitemap/0.xml shipped only product URLs and
 * dropped the home page, /browse, categories, brands, guides and topic pages.
 */
export function sitemapChunkIndex(id: unknown): number {
  const n = typeof id === 'number' ? id : Number.parseInt(String(id ?? '').replace(/\.xml$/, ''), 10);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

/**
 * Best-effort lastModified for a Firestore-backed record. Accepts a Date, an
 * Admin/Client Timestamp (toDate), a serialised {seconds} object, an ISO string
 * or epoch millis. Returns undefined when nothing usable is present so the
 * sitemap omits <lastmod> rather than claiming every listing changed "now".
 */
export function toSitemapDate(...candidates: unknown[]): Date | undefined {
  for (const v of candidates) {
    let d: Date | undefined;
    if (v instanceof Date) d = v;
    else if (v && typeof (v as { toDate?: unknown }).toDate === 'function') d = (v as { toDate: () => Date }).toDate();
    else if (v && typeof v === 'object' && typeof (v as { seconds?: unknown }).seconds === 'number') d = new Date((v as { seconds: number }).seconds * 1000);
    else if (typeof v === 'string' || typeof v === 'number') d = new Date(v);
    if (d && !Number.isNaN(d.getTime()) && d.getTime() > 0) return d;
  }
  return undefined;
}
