/** Brand landing pages we want indexed (also listed in the sitemap). */
export const KNOWN_BRANDS = ['nike', 'jordan', 'adidas', 'yeezy', 'new-balance', 'asics', 'pokemon', 'panini', 'topps', 'magic-the-gathering'] as const;

export function isKnownBrand(slug: string): boolean {
  return (KNOWN_BRANDS as readonly string[]).includes(slug.toLowerCase());
}

export function brandDisplayName(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/-/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
