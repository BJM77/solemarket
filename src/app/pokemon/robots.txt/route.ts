import { STOREFRONTS } from '@/config/storefronts';

/** robots.txt for pokemon.benched.au (middleware rewrites /robots.txt there to this route). */
export const revalidate = 3600;

export function GET() {
  const origin = STOREFRONTS.pokemon.launched
    ? STOREFRONTS.pokemon.origin
    : (process.env.NEXT_PUBLIC_SITE_URL || 'https://benched.au');

  const sitemapUrl = STOREFRONTS.pokemon.launched
    ? `${origin}/sitemap.xml`
    : `${origin}/pokemon/sitemap.xml`;

  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin/',
    'Disallow: /profile/',
    'Disallow: /checkout',
    'Disallow: /order',
    'Disallow: /messages',
    'Disallow: /sell',
    'Disallow: /samcam',
    'Disallow: /autocard',
    'Disallow: /api/',
    'Disallow: /*?*',
    '',
    `Sitemap: ${sitemapUrl}`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
