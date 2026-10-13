'use server';

import * as admin from 'firebase-admin';
import { firestoreDb } from '@/lib/firebase/admin';
import { ensureActionAuth } from '@/lib/action-utils';
import { checkRateLimit } from '@/lib/rate-limit-guard';
import { sanitizeCriteria, describeCriteria, type SavedSearchCriteria } from '@/lib/saved-search/match';

const MAX_SAVED_SEARCHES = 25;

export interface SavedSearch {
  id: string;
  name: string;
  criteria: SavedSearchCriteria;
  alertsEnabled: boolean;
  createdAt?: string;
}

const col = (uid: string) => firestoreDb.collection('users').doc(uid).collection('saved_searches');

export async function saveSearch(idToken: string, params: Record<string, any>, name?: string) {
  try {
    const { uid } = await ensureActionAuth(idToken);
    if (!(await checkRateLimit('saved-search', { limit: 20, windowSeconds: 3600, identifier: uid }))) {
      return { success: false, error: 'Too many requests. Try again later.' };
    }
    const criteria = sanitizeCriteria(params);
    const existing = await col(uid).count().get();
    if (existing.data().count >= MAX_SAVED_SEARCHES) {
      return { success: false, error: `You can save up to ${MAX_SAVED_SEARCHES} searches. Delete one first.` };
    }
    const ref = await col(uid).add({
      userId: uid,
      name: (name || describeCriteria(criteria)).slice(0, 80),
      criteria,
      alertsEnabled: true,
      lastNotifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (e: any) {
    return { success: false, error: e?.message?.includes('auth') ? 'Please sign in to save searches.' : 'Could not save search.' };
  }
}

export async function listSavedSearches(idToken: string): Promise<SavedSearch[]> {
  const { uid } = await ensureActionAuth(idToken);
  const snap = await col(uid).orderBy('createdAt', 'desc').limit(MAX_SAVED_SEARCHES).get();
  return snap.docs.map((d: admin.firestore.QueryDocumentSnapshot) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      criteria: data.criteria || {},
      alertsEnabled: !!data.alertsEnabled,
      createdAt: data.createdAt?.toDate?.().toISOString?.(),
    };
  });
}

export async function setSavedSearchAlerts(idToken: string, id: string, enabled: boolean) {
  const { uid } = await ensureActionAuth(idToken);
  await col(uid).doc(id).update({ alertsEnabled: !!enabled });
  return { success: true };
}

export async function deleteSavedSearch(idToken: string, id: string) {
  const { uid } = await ensureActionAuth(idToken);
  await col(uid).doc(id).delete();
  return { success: true };
}
