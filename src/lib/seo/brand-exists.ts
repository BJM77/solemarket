import 'server-only';
import { cache } from 'react';
import { firestoreDb } from '@/lib/firebase/admin';

/**
 * True if at least one available listing carries this brand. Returns null if the
 * lookup fails, so callers can fall back to rendering (noindex) instead of 404ing.
 */
export const brandHasListings = cache(async (displayBrand: string): Promise<boolean | null> => {
  try {
    // The brand page matches brand or subCategory, so check both (equality-only: no composite index needed).
    for (const field of ['brand', 'subCategory']) {
      const snap = await firestoreDb
        .collection('products')
        .where(field, '==', displayBrand)
        .where('status', '==', 'available')
        .limit(1)
        .get();
      if (!snap.empty) return true;
    }
    return false;
  } catch {
    return null;
  }
});
