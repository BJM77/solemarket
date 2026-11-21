import { getLiveListings } from '@/lib/seo/landing-listings.server';
import { isCoinListing } from '@/lib/coin-listings';
import { isPokemonListing } from '@/lib/pokemon-listings';
import { getProductUrl } from '@/lib/utils/url';
import { schemaBrand } from '@/lib/seo/listing-seo';
import { schemaItemCondition } from '@/lib/seo/item-condition';

export const revalidate = 3600;

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/**
 * Google Merchant Center / Free Product Listings XML feed.
 * Allows Benched active sneakers and trading cards to surface in Google Shopping tab in Australia.
 */
export async function GET() {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://benched.au').replace(/\/$/, '');
  let products: Awaited<ReturnType<typeof getLiveListings>> = [];

  try {
    const live = await getLiveListings();
    // benched.au is basketball sneakers and cards only: coins and Pokémon/TCG have their own
    // storefronts, and Merchant Center rejects items without a real price.
    products = live.filter((p) => !isCoinListing(p) && !isPokemonListing(p) && Number(p.price) > 0);
  } catch (err) {
    console.error('Google Merchant Feed error:', err);
  }

  const itemsXml = products.map((p) => {
    const title = escapeXml(p.title || 'Product');
    const desc = escapeXml(p.seoDescription || p.description || `${p.title} available on Benched Australia`);
    const link = `${baseUrl}${getProductUrl(p)}`;
    const image = p.imageUrls?.[0] ? escapeXml(p.imageUrls[0]) : '';
    const price = Number(p.price || 0).toFixed(2);
    const brand = escapeXml(schemaBrand(p) || p.brand || p.manufacturer || 'Benched');
    const condition = schemaItemCondition(p.condition) === 'https://schema.org/NewCondition' ? 'new' : 'used';
    const availability = p.status === 'available' ? 'in_stock' : 'out_of_stock';
    const size = p.size ? `<g:size>${escapeXml(String(p.size))}</g:size>` : '';
    const color = (p.colorway || p.color) ? `<g:color>${escapeXml(String(p.colorway || p.color))}</g:color>` : '';
    const mpn = p.styleCode ? `<g:mpn>${escapeXml(String(p.styleCode))}</g:mpn>` : '';

    return `    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <g:title>${title}</g:title>
      <g:description>${desc}</g:description>
      <g:link>${link}</g:link>
      <g:image_link>${image}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:price>${price} AUD</g:price>
      <g:brand>${brand}</g:brand>
      <g:condition>${condition}</g:condition>
      ${size}
      ${color}
      ${mpn}
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Benched Australia Marketplace Feed</title>
    <link>${baseUrl}</link>
    <description>Live sneakers and trading cards from Australian sellers on Benched</description>
${itemsXml}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
