import { MetadataRoute } from 'next';
import { STOREFRONTS } from '@/config/storefronts';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://benched.au';
  
  const sitemaps: string[] = [`${baseUrl}/sitemap.xml`];
  if (!STOREFRONTS.coins.launched) sitemaps.push(`${baseUrl}/coins/sitemap.xml`);
  if (!STOREFRONTS.pokemon.launched) sitemaps.push(`${baseUrl}/pokemon/sitemap.xml`);

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/api/og-proxy', '/api/ai-feed', '/api/feeds/google-merchant'],
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
    sitemap: sitemaps.length === 1 ? sitemaps[0] : sitemaps,
  };
}
