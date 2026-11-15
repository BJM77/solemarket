import { MetadataRoute } from 'next';
import { STOREFRONTS } from '@/config/storefronts';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://benched.au';
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/api/og-proxy', '/api/ai-feed'],
        disallow: ['/admin/', '/profile/', '/*?*'],
      },
      {
        userAgent: [
          'GPTBot', 
          'ChatGPT-User', 
          'ClaudeBot', 
          'Claude-Web', 
          'PerplexityBot', 
          'Applebot-Extended', 
          'Google-Extended', 
          'GoogleOther',
          'cohere-ai',
          'Meta-ExternalAgent'
        ],
        allow: ['/', '/api/ai-feed'],
        disallow: ['/admin/', '/profile/', '/*?*'],
      }
    ],
    // The coins storefront has its own sitemap; it moves to coins.benched.au/robots.txt once launched.
    sitemap: STOREFRONTS.coins.launched ? `${baseUrl}/sitemap.xml` : [`${baseUrl}/sitemap.xml`, `${baseUrl}/coins/sitemap.xml`],
  };
}
