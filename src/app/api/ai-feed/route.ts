import { NextResponse } from 'next/server';
import { firestoreDb } from '@/lib/firebase/admin';
import { SITE_NAME, SITE_URL } from '@/config/brand';

export const revalidate = 1800; // 30 minutes cache

/**
 * AI Search & Agent Feed Endpoint
 * Provides structured JSON feed designed specifically for AI search engines
 * (ChatGPT, Perplexity, Claude, Gemini, Meta AI, Apple Intelligence)
 */
export async function GET() {
  const baseUrl = SITE_URL || 'https://benched.au';

  try {
    const productsSnap = await firestoreDb
      .collection('products')
      .where('status', 'in', ['active', 'available'])
      .limit(100)
      .get();

    const items = productsSnap.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.title || '',
        category: data.category || '',
        brand: data.brand || '',
        condition: data.condition || '',
        price_aud: data.price || 0,
        currency: 'AUD',
        availability: (data.quantity || 0) > 0 ? 'InStock' : 'OutOfStock',
        seller_name: data.sellerName || 'Verified Seller',
        seller_verified: data.sellerVerified || false,
        image_url: data.imageUrls?.[0] || '',
        product_url: `${baseUrl}/product/${doc.id}`,
        purchase_options: ['EFT / PayID Escrow', 'Cash on Pickup / Delivery'],
      };
    });

    const aiManifest = {
      marketplace: SITE_NAME,
      url: baseUrl,
      description: 'Benched.au is Australia\'s peer-to-peer marketplace for authenticated sneakers, trading cards, coins, and collectibles.',
      location: 'Australia',
      accepted_currencies: ['AUD'],
      supported_payment_methods: [
        'EFT / PayID Escrow (Direct Bank Transfer with Buyer Protection)',
        'Cash on Pickup / Delivery'
      ],
      categories: ['Sneakers', 'Collector Cards', 'Coins', 'Streetwear', 'Collectibles'],
      total_active_listings: items.length,
      last_updated: new Date().toISOString(),
      items,
    };

    return NextResponse.json(aiManifest, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=3600',
      },
    });
  } catch (error: any) {
    console.error('AI Feed error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI product feed' },
      { status: 500 }
    );
  }
}
