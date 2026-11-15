import { getLiveListings } from '@/lib/seo/landing-listings.server';
import { onlyCoins } from '@/lib/coin-listings';
import { getProductUrl } from '@/lib/utils/url';
import { toSitemapDate } from '@/lib/seo/sitemap';
import { latestListingDate } from '@/lib/seo/landing-listings';
import { coinsPublicUrl } from '@/lib/storefront-routing';
import { buildCoinsSitemapXml, type CoinsSitemapEntry } from '@/lib/coins/sitemap';

/**
 * Benched Coins sitemap: /coins/sitemap.xml (coins.benched.au/sitemap.xml once
 * the subdomain is live). Coin pages are kept out of the basketball sitemap.
 */
export const revalidate = 3600;

export async function GET() {
  let coins: Awaited<ReturnType<typeof getLiveListings>> = [];
  try {
    coins = onlyCoins(await getLiveListings());
  } catch (err) {
    console.error('Coins sitemap: failed to load listings', err);
  }
  const lastmod = latestListingDate(coins);
  const entries: CoinsSitemapEntry[] = [
    { loc: coinsPublicUrl('/'), lastmod, priority: 1 },
    { loc: coinsPublicUrl('/browse'), lastmod, priority: 0.9 },
  ];
  try {
    const { SEO_TOPICS } = await import('@/config/seo-topics');
    for (const t of SEO_TOPICS) if (t.category === 'Coins') entries.push({ loc: coinsPublicUrl(`/${t.slug}`), priority: 0.7 });
  } catch { /* topics are optional */ }
  for (const p of coins) {
    entries.push({ loc: coinsPublicUrl(getProductUrl({ ...p, category: 'Coins' })), lastmod: toSitemapDate(p.updatedAt, p.createdAt), priority: 0.6 });
  }
  return new Response(buildCoinsSitemapXml(entries), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
