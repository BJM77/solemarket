import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://benched.au';
  
  // NOTE: Standard robots.txt doesn't support 'Content-Signal' yet.
  // To avoid Lighthouse errors, we stick to standard directives.
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/api/og-proxy'],
      disallow: ['/admin/', '/profile/', '/api/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
