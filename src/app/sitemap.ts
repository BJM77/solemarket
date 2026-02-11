
import { MetadataRoute } from 'next';
import { getCategories, getActiveProductIds, getActiveProductCount } from '@/lib/firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

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

export async function generateSitemaps() {
  const totalProducts = await getActiveProductCount();
  const numberOfSitemaps = Math.ceil(totalProducts / PRODUCT_SITEMAP_SIZE);

  // Return an array of sitemap IDs
  return Array.from({ length: numberOfSitemaps }, (_, i) => ({ id: i }));
}

export default async function sitemap({
  id,
}: {
  id: number;
}): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://studio-8322868971-8ca89.web.app';

  // ID 0 contains static routes, categories, AND GUIDES
  if (id === 0) {
    const staticRoutes: MetadataRoute.Sitemap = [
      '',
      '/browse',
      '/sell',
      '/about',
      '/how-it-works',
      '/safety-tips',
      '/donate',
      '/vault',
      '/bidsy',
      '/collector-cards',
      '/collector-cards/sports',
      '/collector-cards/trading',
      '/coins',
      '/coins/bullion',
      '/coins/notes',
      '/collectibles',
      '/collectibles/comics',
      '/general',
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

    // Add first chunk of products to sitemap 0
    const productIds = await getActiveProductIds(PRODUCT_SITEMAP_SIZE, 0);
    const productRoutes: MetadataRoute.Sitemap = productIds.map(id => ({
      url: `${baseUrl}/product/${id}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    }));

    return [...staticRoutes, ...categoryRoutes, ...guideRoutes, ...productRoutes];
  }

  // Subsequent IDs only contain products
  const offset = id * PRODUCT_SITEMAP_SIZE;
  const productIds = await getActiveProductIds(PRODUCT_SITEMAP_SIZE, offset);

  return productIds.map(id => ({
    url: `${baseUrl}/product/${id}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.6,
  }));
}
