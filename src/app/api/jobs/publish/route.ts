import { NextResponse } from 'next/server';
import { runPublishSlice, kickPublishJob } from '@/lib/jobs/publish-job';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** Worker for background bulk publish. Authorised by the job's own runToken. */
export async function POST(request: Request) {
    let body: any;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }); }
    const { jobId, runToken } = body || {};
    if (typeof jobId !== 'string' || typeof runToken !== 'string' || !/^[\w-]{1,64}$/.test(jobId)) {
        return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }
    try {
        const more = await runPublishSlice(jobId, runToken);
        if (more) await kickPublishJob(jobId, runToken);
        return NextResponse.json({ ok: true, more });
    } catch (e: any) {
        console.error('[publish-job] slice failed', jobId, e?.message);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
