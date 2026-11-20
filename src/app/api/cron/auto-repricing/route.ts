import { NextResponse } from 'next/server';
import { runAutoRepricing } from '@/ai/flows/auto-repricing';
import { reportError } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request) {
    if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const result = await runAutoRepricing();
        return NextResponse.json({ ok: true, ...result });
    } catch (e: any) {
        reportError(e, 'cron/auto-repricing');
        return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    return GET(request);
}
