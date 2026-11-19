import { coinsPublicUrl } from '@/lib/storefront-routing';

/** robots.txt for coins.benched.au (middleware rewrites /robots.txt there to this route). */
export const revalidate = 3600;

export function GET() {
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin/',
    'Disallow: /profile/',
    'Disallow: /checkout',
    'Disallow: /order',
    'Disallow: /messages',
    'Disallow: /sell',
    'Disallow: /coincam',
    'Disallow: /api/',
    'Disallow: /*?*',
    '',
    `Sitemap: ${coinsPublicUrl('/sitemap.xml')}`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
