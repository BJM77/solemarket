import { MetadataRoute } from 'next';
import { STOREFRONTS } from '@/config/storefronts';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://benched.au';
  
  const sitemaps: string[] = [`${baseUrl}/sitemap.xml`];
  if (!STOREFRONTS.coins.launched) sitemaps.push(`${baseUrl}/coins/sitemap.xml`);
  if (!STOREFRONTS.pokemon.launched) sitemaps.push(`${baseUrl}/pokemon/sitemap.xml`);

  const privateAndAppRoutes = [
    '/admin/',
    '/profile/',
    '/checkout',
    '/order',
    '/messages',
    '/sell/wizard',
    '/sell/create',
    '/sell/dashboard',
    '/sell/listings',
    '/sell/review',
    '/sell/drafts-review',
    '/sell/fast-bulk',
    '/sell/bulk',
    '/sell/bulk-csv-lister',
    '/sell/autofast',
    '/sell/proload',
    '/sell/settings',
    '/sell/payouts',
    '/seller/dashboard',
    '/seller/analytics',
    '/seller/bundles',
    '/seller/price-check',
    '/seller/onboarding',
    '/seller/agreement',
    '/samcam',
    '/procam',
    '/coincam',
    '/shoecam',
    '/autocard',
    '/sign-in',
    '/sign-up',
    '/complete-profile',
    '/verify',
    '/api/',
    '/*?*',
  ];

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/api/og-proxy', '/api/ai-feed', '/api/feeds/google-merchant'],
        disallow: privateAndAppRoutes,
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
        disallow: privateAndAppRoutes,
      }
    ],
    sitemap: sitemaps.length === 1 ? sitemaps[0] : sitemaps,
  };
}
