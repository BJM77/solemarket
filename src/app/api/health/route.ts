import { NextResponse } from 'next/server';
import { firestoreDb } from '@/lib/firebase/admin';
import { IS_PROD, IS_STRICT_PROD } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const start = Date.now();
        // Basic health check: Try to reach Firestore
        const healthRef = firestoreDb.collection('_health').doc('status');
        await healthRef.get();
        const latency = Date.now() - start;

        return NextResponse.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            latency: `${latency}ms`,
            environment: IS_STRICT_PROD ? 'production' : (IS_PROD ? 'staging' : 'development'),
            services: {
                firestore: 'operational',
                nextjs: 'operational',
            },
        });
    } catch (error) {
        console.error('Health check failed:', error);
        return NextResponse.json(
            {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 503 }
        );
    }
}
