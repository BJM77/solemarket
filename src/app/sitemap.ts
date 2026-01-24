
import { MetadataRoute } from 'next';
import { getCategories } from '@/lib/firebase/firestore';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://picksy.com.au';

  // Key static routes that should be indexed
  const staticRoutes: MetadataRoute.Sitemap = [
    '',
    '/browse',
    '/sell',
    '/about',
    '/how-it-works',
    '/safety-tips',
    '/donate',
    '/vault',
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


  // In a real application, you would also programmatically fetch all product IDs
  // to add dynamic product pages to the sitemap. This would require a more
  // advanced, paginated sitemap generation strategy for performance.
  // For example:
  // const products = await getAllProductIds();
  // const productRoutes = products.map(id => ({ url: `${baseUrl}/product/${id}`, ... }));

  return [...staticRoutes, ...categoryRoutes];
}
