
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

export const revalidate = 86400; // Cache sitemap for 24 hours (stops hitting Firestore every second)

export async function generateSitemaps() {
  const totalProducts = await getActiveProductCount();
  const chunkCount = Math.ceil(totalProducts / PRODUCT_SITEMAP_SIZE);
  
  // Create an array mapping each chunk: [{ id: 0 }, { id: 1 }, ... ]
  // Chunk 0 will contain the static pages + top content + first 5000 products
  return Array.from({ length: chunkCount || 1 }, (_, i) => ({ id: i }));
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://benched.au';

  const productRoutes: MetadataRoute.Sitemap = [];
  
  try {
     const productsChunk = await getActiveProducts(PRODUCT_SITEMAP_SIZE, id * PRODUCT_SITEMAP_SIZE);
     productsChunk.forEach(p => {
       productRoutes.push({
         url: `${baseUrl}${getProductUrl(p)}`,
         lastModified: new Date(),
         changeFrequency: 'daily',
         priority: 0.6,
       });
     });
  } catch (err) {
      console.error('Error generating product sitemap chunk:', err);
  }

  // Only include static routes, categories, and guides in the very first sitemap chunk
  if (id === 0) {
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

      return [...staticRoutes, ...categoryRoutes, ...guideRoutes, ...topicRoutes, ...productRoutes];
  }

  // For other chunks, return only products
  return productRoutes;
}
