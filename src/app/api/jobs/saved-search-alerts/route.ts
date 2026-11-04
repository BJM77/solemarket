import { NextResponse } from 'next/server';
import { runSavedSearchAlerts } from '@/lib/jobs/saved-search-alerts';
import { reportError } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Saved-search alerts worker. Needs no secret: it only processes newly published listings,
 * is idempotent (per search+listing ledger), returns counts only, and a Firestore lease plus
 * a 30 s minimum interval stop it being run more often than that.
 * Triggered after publishing and every 15 min by .github/workflows/saved-search-alerts.yml.
 */
async function handle() {
    try {
        const r = await runSavedSearchAlerts();
        return NextResponse.json({ ok: true, ...r });
    } catch (e) {
        reportError(e, 'cron', { job: 'saved-search-alerts' });
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
export const POST = handle;
export const GET = handle;
