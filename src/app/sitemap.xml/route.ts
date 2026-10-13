import { generateSitemaps } from '../sitemap';

/**
 * Sitemap index at /sitemap.xml (the URL robots.txt advertises). Next serves the
 * chunked sitemaps from src/app/sitemap.ts at /sitemap/{id}.xml but publishes no index.
 */
export const revalidate = 3600;

export async function GET() {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://benched.au').replace(/\/$/, '');
  const ids = await generateSitemaps();
  const now = new Date().toISOString();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ids.map(({ id }) => `  <sitemap><loc>${baseUrl}/sitemap/${id}.xml</loc><lastmod>${now}</lastmod></sitemap>`).join('\n')}
</sitemapindex>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
