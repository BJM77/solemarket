import 'server-only';
import { unstable_cache } from 'next/cache';
import { firestoreDb } from '@/lib/firebase/admin';
import { toSearchLite, type SearchLite } from '@/lib/search/inline';

/** Upper bound on live listings in the index (the catalogue is far smaller today). */
export const MAX_LIVE_ROWS = 3000;
/** Checked-in (sold) listings: only the most recent, so they can never crowd out live ones. */
export const MAX_SOLD_ROWS = 500;

export const SEARCH_INDEX_FIELDS = [
  'title', 'price', 'category', 'subCategory', 'brand', 'model', 'size', 'year', 'manufacturer',
  'gradingCompany', 'grade', 'cardNumber', 'player', 'keywords', 'createdAt', 'status', 'isDraft', 'storefrontId',
  'publicReleaseAt',
];

async function loadSoldDocs() {
  const sold = firestoreDb.collection('products').where('status', '==', 'sold').select(...SEARCH_INDEX_FIELDS);
  try {
    // Uses the existing (status, createdAt desc) composite index.
    return (await sold.orderBy('createdAt', 'desc').limit(MAX_SOLD_ROWS).get()).docs;
  } catch (e) {
    console.warn('[search-lite] newest-sold query failed; using an unordered sold sample', e);
    return (await sold.limit(MAX_SOLD_ROWS).get()).docs;
  }
}

/**
 * The lite index shared by the header dropdown (/api/search/lite) and the /browse?q=
 * results page: every live listing plus recent checked-in ones, text fields + price only.
 * Live listings are read without an orderBy so legacy rows missing createdAt are kept.
 * Cached for 2 minutes and busted by revalidateTag('products') on listing writes.
 */
export const loadSearchIndex = unstable_cache(
  async (): Promise<{ rows: SearchLite[]; builtAt: number; capped: boolean }> => {
    const [live, sold] = await Promise.all([
      firestoreDb.collection('products')
        .where('status', '==', 'available')
        .select(...SEARCH_INDEX_FIELDS)
        .limit(MAX_LIVE_ROWS)
        .get(),
      loadSoldDocs(),
    ]);
    const rows: SearchLite[] = [];
    for (const doc of [...live.docs, ...sold]) {
      const row = toSearchLite(doc.id, doc.data());
      if (row) rows.push(row);
    }
    return { rows, builtAt: Date.now(), capped: live.size >= MAX_LIVE_ROWS };
  },
  ['search-lite-index-v3'],
  { revalidate: 120, tags: ['products'] }
);
