import { NextResponse } from 'next/server';
import { firestoreDb } from '@/lib/firebase/admin';
import { configuredProvider, bulkUpsert } from '@/lib/search';
import { productToSearchDocument } from '@/lib/search/mapping';
import { reportError } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Incremental search index sync. Call every 5 minutes from Cloud Scheduler with
 * `Authorization: Bearer $CRON_SECRET`. Upserts every product whose updatedAt changed in
 * the last `?minutes=` (default 10; use a large value e.g. 525600 for a full backfill).
 * Products that are no longer available are upserted with their new status, which the
 * search filters (status:=available) exclude.
 */
export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (configuredProvider() === 'firestore') {
    return NextResponse.json({ skipped: true, reason: 'SEARCH_PROVIDER not configured' });
  }
  const minutes = Math.min(Number(new URL(request.url).searchParams.get('minutes')) || 10, 525600);
  const since = new Date(Date.now() - minutes * 60_000);

  let synced = 0;
  try {
    let last: any = null;
    // Page through in batches of 250 to stay within memory/time limits.
    for (;;) {
      let q = firestoreDb.collection('products').where('updatedAt', '>=', since).orderBy('updatedAt').limit(250);
      if (last) q = q.startAfter(last);
      const snap = await q.get();
      if (snap.empty) break;
      await bulkUpsert(snap.docs.map((d: any) => productToSearchDocument(d.id, d.data())));
      synced += snap.size;
      last = snap.docs[snap.docs.length - 1];
      if (snap.size < 250) break;
    }
    return NextResponse.json({ ok: true, synced, provider: configuredProvider(), since: since.toISOString() });
  } catch (e) {
    reportError(e, 'cron', { job: 'search-sync', synced });
    return NextResponse.json({ ok: false, synced, error: (e as Error).message }, { status: 500 });
  }
}
