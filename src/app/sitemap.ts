import { KNOWN_BRANDS, brandDisplayName } from '@/lib/seo/brands';
import { MetadataRoute } from 'next';
import { getActiveProductCount, getActiveProducts } from '@/lib/firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { getProductUrl } from "@/lib/utils/url";
import { sitemapChunkIndex, toSitemapDate } from "@/lib/seo/sitemap";
import { isCoinListing } from "@/lib/coin-listings";
import { isPokemonListing } from "@/lib/pokemon-listings";
import { getLiveListings } from '@/lib/seo/landing-listings.server';
import { latestListingDate, matchBrandListings, matchLandingListings } from '@/lib/seo/landing-listings';
import { isCardCategory } from '@/lib/constants/marketplace';

/**
 * World-Class Sitemap Generation
 * Supports indexing of all products by splitting them into chunks.
 */

const PRODUCT_SITEMAP_SIZE = 5000; // Limit per sitemap chunk

async function getGuideRoutes(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const { SEO_GUIDES } = await import('@/config/guides');
    return SEO_GUIDES.map((g) => ({
      url: `${baseUrl}/guides/${g.slug}`,
      lastModified: toSitemapDate(g.date),
      changeFrequency: 'monthly',
      priority: 0.7,
    }));
  } catch (error) {
    console.error('Error loading guides for sitemap:', error);
    return [];
  }
}

export const revalidate = 3600; // Cache sitemap for 1 hour

export async function generateSitemaps() {
  try {
    const totalCount = await getActiveProductCount();
    const numberOfSitemaps = Math.ceil(totalCount / PRODUCT_SITEMAP_SIZE);
    const count = Math.max(1, numberOfSitemaps);
    return Array.from({ length: count }, (_, id) => ({ id }));
  } catch (error) {
    console.error('Error generating sitemaps list:', error);
    return [{ id: 0 }];
  }
}

export default async function sitemap({ id: rawId }: { id: number | string }): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://benched.au').replace(/\/$/, '');
  // Next passes the id as a string ("0") at runtime; normalise before comparing.
  const id = sitemapChunkIndex(rawId);
  const startOffset = id * PRODUCT_SITEMAP_SIZE;

  // Pages (home, sections, landing pages, guides) only go in sitemap 0.
  let pageRoutes: MetadataRoute.Sitemap = [];
  if (id === 0) {
    // lastmod is the newest live listing in that section; pages without a real
    // change date omit it rather than claiming they changed "now".
    // One cached read of every live listing; landing-page matches are computed from it.
    const allLive = await getLiveListings();
    const live = allLive.filter((p) => !isCoinListing(p));
    const tcg = live.filter((p) => isPokemonListing(p));
    const main = live.filter((p) => !isPokemonListing(p));
    const cards = main.filter((p) => isCardCategory(p.category));
    const shoes = main.filter((p) => !isCardCategory(p.category));

    const listingPages: [string, Date | undefined, number][] = [
      ['', latestListingDate(main), 1],
      ['/browse', latestListingDate(main), 0.8],
      ['/shoes', latestListingDate(shoes), 0.9],
      ['/cards', latestListingDate(cards), 0.9],
      ['/pokemon', latestListingDate(tcg), 0.8],
    ];
    const infoPages = [
      '/sellers', '/card-drops', '/sell', '/drops', '/about', '/how-it-works', '/safety-tips', '/terms',
      '/privacy', '/dmca', '/prohibited-items', '/authenticity', '/report-infringement', '/guides', '/help',
      '/size-guide', '/contact',
    ];
    pageRoutes = [
      ...listingPages.map(([route, lastModified, priority]) => ({
        url: `${baseUrl}${route}`,
        lastModified,
        changeFrequency: 'daily' as const,
        priority,
      })),
      ...infoPages.map((route) => ({ url: `${baseUrl}${route}`, changeFrequency: 'monthly' as const, priority: 0.5 })),
    ];

    // Brand pages and topic landing pages: only those with something for sale (empty ones are noindex).
    for (const brand of KNOWN_BRANDS) {
      const listings = matchBrandListings(allLive, brandDisplayName(brand));
      if (listings.length) {
        pageRoutes.push({ url: `${baseUrl}/brand/${brand}`, lastModified: latestListingDate(listings), changeFrequency: 'weekly', priority: 0.7 });
      }
    }
    try {
      const { SEO_TOPICS } = await import('@/config/seo-topics');
      for (const topic of SEO_TOPICS) {
        if (topic.category === 'Coins') continue;
        const section = topic.category === 'Collector Cards' ? 'cards' : 'shoes';
        const listings = matchLandingListings(allLive, { query: topic.searchQuery, kind: section });
        if (!listings.length) continue;
        pageRoutes.push({ url: `${baseUrl}/${section}/${topic.slug}`, lastModified: latestListingDate(listings), changeFrequency: 'daily', priority: 0.8 });
      }
    } catch (err) {
      console.error('Sitemap: Error loading SEO topics:', err);
    }

    pageRoutes.push(...await getGuideRoutes(baseUrl));

    // Active seller storefronts: include sellers who have active listings on the platform
    const activeSellerIds = Array.from(new Set(allLive.map((p) => p.sellerId).filter(Boolean)));
    for (const sellerId of activeSellerIds) {
      const sellerListings = allLive.filter((p) => p.sellerId === sellerId);
      pageRoutes.push({
        url: `${baseUrl}/seller/${sellerId}`,
        lastModified: latestListingDate(sellerListings),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      });
    }

    try {
      const competitors = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/content/conquesting/competitors.json'), 'utf-8'));
      pageRoutes.push(...Object.keys(competitors).map((slug) => ({
        url: `${baseUrl}/shop-at/${slug}`,
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      })));
    } catch (err) {
      console.error('Sitemap: Error loading conquesting routes:', err);
    }
  }

  // Listing pages (every chunk, offset by id). Coins and Pokémon/TCG have their
  // dedicated sitemaps (/coins/sitemap.xml and /pokemon/sitemap.xml).
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const activeProducts = await getActiveProducts(PRODUCT_SITEMAP_SIZE, startOffset);
    productRoutes = activeProducts
      .filter(p => !isCoinListing(p) && !isPokemonListing(p))
      .map(p => ({
        url: `${baseUrl}${getProductUrl(p)}`,
        lastModified: toSitemapDate(p.updatedAt, p.createdAt),
        changeFrequency: 'daily',
        priority: 0.6,
      }));
  } catch (err) {
    console.error(`Sitemap: Error fetching products for chunk ${id}:`, err);
  }

  return [...pageRoutes, ...productRoutes];
}
