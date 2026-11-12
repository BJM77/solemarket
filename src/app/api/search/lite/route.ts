import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { firestoreDb } from '@/lib/firebase/admin';
import { toSearchLite, type SearchLite } from '@/lib/search/inline';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Upper bound on listings sent to the browser for instant search. */
const MAX_ROWS = 3000;

const FIELDS = [
  'title', 'price', 'category', 'subCategory', 'brand', 'model', 'size', 'year', 'manufacturer',
  'gradingCompany', 'grade', 'cardNumber', 'createdAt', 'status', 'isDraft', 'storefrontId',
];

/**
 * The lite index: every live listing's text fields + price (no images, descriptions or seller
 * data). Cached for 2 minutes and busted by revalidateTag('products') on listing writes.
 */
const loadIndex = unstable_cache(
  async (): Promise<{ rows: SearchLite[]; builtAt: number; capped: boolean }> => {
    const snap = await firestoreDb.collection('products')
      .where('status', '==', 'available')
      .where('isDraft', '==', false)
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
  ['search-lite-index-v1'],
  { revalidate: 120, tags: ['products'] }
);

/** GET /api/search/lite - public, read-only, cacheable. */
export async function GET() {
  const t0 = Date.now();
  try {
    const data = await loadIndex();
    const ms = Date.now() - t0;
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=600',
        'Server-Timing': `index;dur=${ms}`,
      },
    });
  } catch (e) {
    console.error('[search-lite] failed to build index', e);
    return NextResponse.json({ rows: [], builtAt: Date.now(), capped: false, error: 'unavailable' }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
