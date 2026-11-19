import { getLiveListings } from '@/lib/seo/landing-listings.server';
import { isPokemonListing } from '@/lib/pokemon-listings';
import { getProductUrl } from '@/lib/utils/url';
import { toSitemapDate } from '@/lib/seo/sitemap';
import { latestListingDate } from '@/lib/seo/landing-listings';
import { STOREFRONTS } from '@/config/storefronts';

export const revalidate = 3600;

function pokemonUrl(path: string): string {
  const base = STOREFRONTS.pokemon.launched
    ? STOREFRONTS.pokemon.origin
    : 'https://benched.au/pokemon';
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function GET() {
  let pokemonListings: Awaited<ReturnType<typeof getLiveListings>> = [];
  try {
    const live = await getLiveListings();
    pokemonListings = live.filter(isPokemonListing);
  } catch (err) {
    console.error('Pokemon sitemap: failed to load listings', err);
  }

  const lastmod = latestListingDate(pokemonListings);
  const entries: { loc: string; lastmod?: Date; priority: number }[] = [
    { loc: pokemonUrl('/'), lastmod, priority: 1 },
  ];

  for (const p of pokemonListings) {
    entries.push({
      loc: pokemonUrl(getProductUrl(p)),
      lastmod: toSitemapDate(p.updatedAt, p.createdAt),
      priority: 0.7,
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(e => `  <url>
    <loc>${e.loc}</loc>
    ${e.lastmod ? `<lastmod>${e.lastmod.toISOString().split('T')[0]}</lastmod>` : ''}
    <priority>${e.priority.toFixed(1)}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
