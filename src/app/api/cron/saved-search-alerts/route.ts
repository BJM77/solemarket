import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { firestoreDb } from '@/lib/firebase/admin';
import { matchesSavedSearch, criteriaToQueryString, type SavedSearchCriteria } from '@/lib/saved-search/match';
import { reportError } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_ALERTS_PER_SEARCH = 5;

/**
 * Saved-search alerts. Run every 15 min from Cloud Scheduler with
 * `Authorization: Bearer $CRON_SECRET`. Finds listings that became available since
 * the last run and writes an in-app notification for each matching saved search
 * (one digest notification per search per run). The existing notification pipeline
 * (FCM / email) picks these up.
 */
export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const stateRef = firestoreDb.collection('system_state').doc('saved_search_alerts');
  const runStartedAt = new Date();
  try {
    const state = await stateRef.get();
    const since: Date = state.exists && state.data()?.lastRunAt?.toDate ? state.data()!.lastRunAt.toDate() : new Date(Date.now() - 15 * 60_000);

    const newProductsSnap = await firestoreDb.collection('products')
      .where('status', '==', 'available')
      .where('createdAt', '>', since)
      .orderBy('createdAt', 'desc')
      .limit(500)
      .get();
    if (newProductsSnap.empty) {
      await stateRef.set({ lastRunAt: runStartedAt }, { merge: true });
      return NextResponse.json({ ok: true, newProducts: 0, notifications: 0 });
    }
    const products = newProductsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    const searchesSnap = await firestoreDb.collectionGroup('saved_searches').where('alertsEnabled', '==', true).get();
    let batch = firestoreDb.batch();
    let ops = 0;
    let notifications = 0;

    for (const s of searchesSnap.docs) {
      const data = s.data();
      const uid: string = data.userId;
      const criteria: SavedSearchCriteria = data.criteria || {};
      const matches = products.filter((p: any) => p.sellerId !== uid && matchesSavedSearch(p, criteria));
      if (!matches.length) continue;

      const top = matches.slice(0, MAX_ALERTS_PER_SEARCH);
      const qs = criteriaToQueryString(criteria);
      batch.set(firestoreDb.collection('notifications').doc(), {
        recipientId: uid,
        type: 'saved_search_match',
        title: `${matches.length} new match${matches.length > 1 ? 'es' : ''} for "${data.name}"`,
        message: top.map((p: any) => `${p.title} - $${p.price}`).join('\n'),
        link: matches.length === 1 ? `/product/${top[0].id}` : `/browse${qs ? `?${qs}` : ''}`,
        productIds: top.map((p: any) => p.id),
        savedSearchId: s.id,
        read: false,
        createdAt: new Date(),
      });
      batch.update(s.ref, { lastNotifiedAt: admin.firestore.FieldValue.serverTimestamp() });
      ops += 2;
      notifications++;
      if (ops >= 400) { await batch.commit(); batch = firestoreDb.batch(); ops = 0; }
    }
    if (ops) await batch.commit();
    await stateRef.set({ lastRunAt: runStartedAt, lastNotifications: notifications }, { merge: true });
    return NextResponse.json({ ok: true, newProducts: products.length, savedSearches: searchesSnap.size, notifications });
  } catch (e) {
    reportError(e, 'cron', { job: 'saved-search-alerts' });
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
