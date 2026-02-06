import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://studio-8322868971-8ca89.web.app';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/profile/', '/api/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
