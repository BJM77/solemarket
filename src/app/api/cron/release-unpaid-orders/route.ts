import { NextResponse } from 'next/server';
import { releaseExpiredOrders } from '@/lib/payments/server';
import { reportError } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Releases unpaid cash/PayID orders past their paymentDueAt (48h PayID, 72h cash):
 * order -> cancelled, reserved listings -> available, buyer + seller notified.
 * Run every 30 min from Cloud Scheduler with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
    if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const result = await releaseExpiredOrders(new Date());
        return NextResponse.json({ ok: true, ...result });
    } catch (e: any) {
        reportError(e, 'cron/release-unpaid-orders');
        return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
    }
}
