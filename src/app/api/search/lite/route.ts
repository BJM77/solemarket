import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { firestoreDb } from '@/lib/firebase/admin';
import { toSearchLite, type SearchLite } from '@/lib/search/inline';
import { toCoinSearchLite, type CoinSearchLite } from '@/lib/coins/search-lite';
import { getSpotPrices } from '@/lib/coins/spot-prices';
import { spotMapFrom, type SpotMap } from '@/lib/coins/filters';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Upper bound on listings sent to the browser for instant search. */
const MAX_ROWS = 3000;

const FIELDS = [
  'title', 'price', 'category', 'subCategory', 'brand', 'model', 'size', 'year', 'manufacturer',
  'gradingCompany', 'grade', 'cardNumber', 'player', 'keywords', 'createdAt', 'status', 'isDraft', 'storefrontId',
];

/** Benched Coins index fields (the coin sell form's facts). */
const COIN_FIELDS = [...FIELDS, 'metal', 'weight', 'purity', 'denomination', 'country', 'mint', 'condition'];

/**
 * The lite index: every live listing's text fields + price (no images, descriptions or seller
 * data). Cached for 2 minutes and busted by revalidateTag('products') on listing writes.
 */
const loadIndex = unstable_cache(
  async (): Promise<{ rows: SearchLite[]; builtAt: number; capped: boolean }> => {
    // Same eligibility as /browse?q=: available + checked-in (sold). Do not require
    // isDraft==false in the query — legacy listings omit the field and would be dropped.
    const snap = await firestoreDb.collection('products')
      .where('status', 'in', ['available', 'sold'])
      .select(...FIELDS)
      .limit(MAX_ROWS)
      .get();
    const rows: SearchLite[] = [];
    for (const doc of snap.docs) {
      const row = toSearchLite(doc.id, doc.data());
      if (row) rows.push(row);
    }
    return { rows, builtAt: Date.now(), capped: snap.size >= MAX_ROWS };
  },
  ['search-lite-index-v2'],
  { revalidate: 120, tags: ['products'] }
);

/**
 * The Benched Coins lite index: live coin and bullion listings only (never basketball),
 * plus the cached AUD spot prices for the "premium over spot" sort (null when unavailable).
 * Legacy coin listings may lack isDraft, so drafts are dropped in memory.
 */
const loadCoinIndex = unstable_cache(
  async (): Promise<{ rows: CoinSearchLite[]; builtAt: number; capped: boolean; spot: SpotMap | null }> => {
    const [snap, prices] = await Promise.all([
      firestoreDb.collection('products')
        .where('status', '==', 'available')
        .select(...COIN_FIELDS)
        .limit(MAX_ROWS)
        .get(),
      getSpotPrices().catch(() => null),
    ]);
    const rows: CoinSearchLite[] = [];
    for (const doc of snap.docs) {
      const row = toCoinSearchLite(doc.id, doc.data());
      if (row) rows.push(row);
    }
    return { rows, builtAt: Date.now(), capped: snap.size >= MAX_ROWS, spot: spotMapFrom(prices) };
  },
  ['search-lite-coins-index-v1'],
  { revalidate: 120, tags: ['products'] }
);

/** GET /api/search/lite - public, read-only, cacheable. `?storefront=coins` = the Benched Coins index. */
export async function GET(request: Request) {
  const t0 = Date.now();
  const coins = new URL(request.url).searchParams.get('storefront') === 'coins';
  try {
    const data = coins ? await loadCoinIndex() : await loadIndex();
    const ms = Date.now() - t0;
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=600',
        'Server-Timing': `index;dur=${ms}`,
      },
    });
  } catch (e) {
    console.error('[search-lite] failed to build index', e);
    return NextResponse.json({ rows: [], builtAt: Date.now(), capped: false, ...(coins ? { spot: null } : {}), error: 'unavailable' }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
