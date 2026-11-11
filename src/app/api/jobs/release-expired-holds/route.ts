import { NextResponse } from 'next/server';
import { firestoreDb } from '@/lib/firebase/admin';
import { releaseExpiredOrders } from '@/lib/payments/server';
import { reportError } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const MIN_INTERVAL_MS = 60_000;

/**
 * Tidies unpaid orders whose 30-minute PayID hold (or 72h cash window) has ended:
 * order -> cancelled, hold removed, buyer + seller told. Listings are already buyable again
 * the moment a hold expires (computed on read), so this is bookkeeping, not a gate.
 * Needs no secret: it only acts on genuinely expired orders, returns counts only, and a
 * Firestore throttle stops it running more than once a minute.
 * Called every 10 min by .github/workflows/release-expired-holds.yml (free).
 */
async function handle() {
    try {
        const ref = firestoreDb.collection('system_state').doc('release_expired_holds');
        const now = Date.now();
        const go = await firestoreDb.runTransaction(async (t: any) => {
            const snap = await t.get(ref);
            const last = Number(snap.exists ? snap.data()?.lastRunAtMs || 0 : 0);
            if (now - last < MIN_INTERVAL_MS) return false;
            t.set(ref, { lastRunAtMs: now }, { merge: true });
            return true;
        });
        if (!go) return NextResponse.json({ ok: true, skipped: true });
        const r = await releaseExpiredOrders(new Date(now));
        return NextResponse.json({ ok: true, ...r });
    } catch (e) {
        reportError(e, 'cron', { job: 'release-expired-holds' });
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
export const POST = handle;
export const GET = handle;
