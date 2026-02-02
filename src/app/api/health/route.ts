import { NextResponse } from 'next/server';
import { firestoreDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Basic health check: Try to reach Firestore
        // Using a dedicated health document to avoid list operations
        const healthRef = firestoreDb.collection('_health').doc('status');
        await healthRef.set({
            lastCheck: new Date(),
            status: 'ok'
        }, { merge: true });

        return NextResponse.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
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
