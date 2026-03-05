
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://benched.au';

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

  const categories = await getCategories();
  const categoryRoutes: MetadataRoute.Sitemap = categories
    .filter(category => category.slug)
    .map((category) => ({
      url: `${baseUrl}/${category.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

  const guideRoutes = await getGuideRoutes(baseUrl);

  // High-value Programmatic SEO Topic Routes
  const { SEO_TOPICS } = await import('@/config/seo-topics');
  const topicRoutes: MetadataRoute.Sitemap = SEO_TOPICS.map(topic => ({
    url: `${baseUrl}/${topic.category === 'Collector Cards' ? 'cards' : 'shoes'}/${topic.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  // Fetch all active products limit 50000 for standard sitemap
  const productsChunk = await getActiveProducts(PRODUCT_SITEMAP_SIZE, 0);
  const productRoutes: MetadataRoute.Sitemap = productsChunk.map(p => ({
    url: `${baseUrl}${getProductUrl(p)}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.6,
  }));

  return [...staticRoutes, ...categoryRoutes, ...guideRoutes, ...topicRoutes, ...productRoutes];
}
