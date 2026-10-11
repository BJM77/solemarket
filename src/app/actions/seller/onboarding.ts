'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { ensureActionAuth } from '@/lib/action-utils';

/** Count of the caller's live or pending listings (for the onboarding checklist). */
export async function getMyActiveListingCount(idToken: string): Promise<number> {
  const { uid } = await ensureActionAuth(idToken);
  const snap = await firestoreDb.collection('products')
    .where('sellerId', '==', uid)
    .where('status', 'in', ['available', 'pending_approval', 'sold'])
    .count()
    .get();
  return snap.data().count;
}
