import { NextResponse } from 'next/server';
import { firestoreDb } from '@/lib/firebase/admin';
import { IS_PROD, IS_STRICT_PROD } from '@/lib/security';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };
const FIRESTORE_TIMEOUT_MS = 5000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
    ]);
}

/**
 * Public health check for uptime monitors.
 *  - GET /api/health            readiness: app + Firestore read (503 if Firestore fails)
 *  - GET /api/health?probe=live liveness: app process only, no dependencies
 * Never returns internal error details.
 */
export async function GET(request: Request) {
    const probe = new URL(request.url).searchParams.get('probe');
    const base = {
        timestamp: new Date().toISOString(),
        environment: IS_STRICT_PROD ? 'production' : (IS_PROD ? 'staging' : 'development'),
        revision: process.env.K_REVISION || process.env.SENTRY_RELEASE || 'local',
    };

    if (probe === 'live') {
        return NextResponse.json({ status: 'healthy', ...base, services: { nextjs: 'operational' } }, { headers: NO_STORE });
    }

    const start = Date.now();
    try {
        await withTimeout(firestoreDb.collection('_health').doc('status').get(), FIRESTORE_TIMEOUT_MS);
        return NextResponse.json({
            status: 'healthy',
            ...base,
            latency: `${Date.now() - start}ms`,
            services: { firestore: 'operational', nextjs: 'operational' },
        }, { headers: NO_STORE });
    } catch (error) {
        console.error('[health] Firestore check failed:', error instanceof Error ? error.message : error);
        return NextResponse.json({
            status: 'unhealthy',
            ...base,
            latency: `${Date.now() - start}ms`,
            services: { firestore: 'down', nextjs: 'operational' },
        }, { status: 503, headers: NO_STORE });
    }
}
