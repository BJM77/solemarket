
import { MetadataRoute } from 'next';
import { getCategories, getActiveProductIds } from '@/lib/firebase/firestore';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://studio-8322868971-8ca89.web.app';

  // Key static routes that should be indexed
  const staticRoutes: MetadataRoute.Sitemap = [
    '',
    '/browse',
    '/sell',
    '/about',
    '/how-it-works',
    '/safety-tips',
    '/donate',
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
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  const categories = await getCategories();
  const categoryRoutes: MetadataRoute.Sitemap = categories
    .filter(category => category.slug)
    .map((category) => ({
      url: `${baseUrl}/${category.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));


  const productIds = await getActiveProductIds(500); // Limit to top 500 for performance
  const productRoutes: MetadataRoute.Sitemap = productIds.map(id => ({
    url: `${baseUrl}/product/${id}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
