
import { MetadataRoute } from 'next';
import { getCategories, getActiveProductIds, getActiveProductCount, getProductById, getActiveProducts } from '@/lib/firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { getProductUrl } from '@/lib/utils';

/**
 * World-Class Sitemap Generation
 * Supports indexing of all products by splitting them into chunks.
 */

const PRODUCT_SITEMAP_SIZE = 5000; // Limit per sitemap chunk

async function getGuideRoutes(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  try {
    const guidesDirectory = path.join(process.cwd(), 'src/content/guides');
    if (!fs.existsSync(guidesDirectory)) return [];

    const filenames = fs.readdirSync(guidesDirectory);
    return filenames
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const slug = file.replace('.json', '');
        return {
          url: `${baseUrl}/guide/topic/${slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.9, // High priority for high-value content
        };
      });
  } catch (error) {
    console.error('Error generating guide sitemap:', error);
    return [];
  }
}

export const revalidate = 86400; // Cache sitemap for 24 hours

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://benched.au';

  // 1. Static Routes
  const staticRoutes: MetadataRoute.Sitemap = [
    '',
    '/browse',
    '/sell',
    '/scan',
    '/drops',
    '/about',
    '/how-it-works',
    '/safety-tips',
    '/donate',
    '/vault',
    '/bidsy',
    '/consign',
    '/terms',
    '/privacy',
    '/dmca',
    '/prohibited-items'
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: route === '' ? 1 : 0.8,
  }));

  // 2. Dynamic Categories
  let categoryRoutes: MetadataRoute.Sitemap = [];
  try {
    const categories = await getCategories();
    categoryRoutes = categories
      .filter(category => category.slug)
      .map((category) => ({
        url: `${baseUrl}/${category.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      }));
  } catch (err) {
    console.error('Sitemap: Error fetching categories:', err);
  }

  // 3. Guide Routes
  const guideRoutes = await getGuideRoutes(baseUrl);

  // 4. Topic Routes (Programmatic SEO)
  let topicRoutes: MetadataRoute.Sitemap = [];
  try {
    const { SEO_TOPICS } = await import('@/config/seo-topics');
    topicRoutes = SEO_TOPICS.map(topic => ({
      url: `${baseUrl}/${topic.category === 'Collector Cards' ? 'cards' : 'shoes'}/${topic.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    }));
  } catch (err) {
    console.error('Sitemap: Error loading SEO topics:', err);
  }

  // 5. Product Routes (All active products)
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    // Get all active products (up to the limit)
    const activeProducts = await getActiveProducts(PRODUCT_SITEMAP_SIZE);
    productRoutes = activeProducts.map(p => ({
      url: `${baseUrl}${getProductUrl(p)}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    }));
  } catch (err) {
    console.error('Sitemap: Error fetching products:', err);
  }

  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...guideRoutes,
    ...topicRoutes,
    ...productRoutes
  ];
}
