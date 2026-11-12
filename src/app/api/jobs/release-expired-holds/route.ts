import { NextResponse } from 'next/server';
import { firestoreDb } from '@/lib/firebase/admin';
import { releaseExpiredOrders } from '@/lib/payments/server';
import { expireStaleRequests } from '@/lib/checkout/requests-server';
import { reportError } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const MIN_INTERVAL_MS = 60_000;

/**
 * 1. Requests: pending requests the seller didn't answer within 24h, and counter-offers the buyer
 *    didn't answer within 24h -> 'expired' (already treated as expired on read; this writes it).
 * 2. Older orders: unpaid orders whose 30-minute PayID hold (or 72h cash window) has ended ->
 *    cancelled, seller told in-app + by push (no email). Seller-accepted requests are never
 *    auto-cancelled: the seller relists them when they choose.
 * Needs no secret: it only acts on genuinely expired orders, returns counts only, and a
 * Firestore throttle stops it running more than once a minute.
 * Called every 10 min by .github/workflows/expire-requests.yml (free). The URL keeps its old name so the job works during deploys.
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
        const requests = await expireStaleRequests(new Date(now));
        const holds = await releaseExpiredOrders(new Date(now));
        return NextResponse.json({ ok: true, requests, holds });
    } catch (e) {
        reportError(e, 'cron', { job: 'release-expired-holds' });
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
export const POST = handle;
export const GET = handle;
