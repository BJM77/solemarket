
import { NextRequest, NextResponse } from 'next/server';
import { firestoreDb, auth } from '@/lib/firebase/admin';

export async function GET(
    request: NextRequest,
    { params }: { params: { service: string } }
) {
    const { service } = await params;
    const start = Date.now();

    try {
        let status = 'unknown';
        let details: any = {};

        switch (service) {
            case 'ai':
                // Check if API key is configured
                const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
                if (apiKey) {
                    status = 'healthy';
                } else {
                    status = 'degraded';
                    details.error = 'Missing AI API Key (GOOGLE_GENAI_API_KEY or GEMINI_API_KEY)';
                    throw new Error('Missing AI API Key');
                }
                break;

            case 'auth':
                // Check if Firebase Auth is responsive
                try {
                    // Just listing 1 user to check connection
                    await auth.listUsers(1);
                    status = 'healthy';
                } catch (e: any) {
                    status = 'unhealthy';
                    details.error = e.message;
                    throw e;
                }
                break;

            case 'db':
                // Check if Firestore is responsive
                try {
                    await firestoreDb.listCollections();
                    status = 'healthy';
                } catch (e: any) {
                    status = 'unhealthy';
                    details.error = e.message;
                    throw e;
                }
                break;

            case 'stripe':
                if (process.env.STRIPE_SECRET_KEY) {
                    status = 'healthy';
                } else {
                    status = 'degraded';
                    details.message = 'Stripe key not configured';
                    // Not critical for app start, but reported
                }
                break;

            case 'email':
                if (process.env.SENDGRID_API_KEY) {
                    status = 'healthy';
                } else {
                    status = 'degraded';
                    details.message = 'SendGrid key not configured';
                }
                break;

            default:
                return NextResponse.json({ error: 'Unknown service' }, { status: 400 });
        }

        const latency = Date.now() - start;

        return NextResponse.json({
            status,
            latency,
            details,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        const latency = Date.now() - start;
        return NextResponse.json({
            status: 'unhealthy',
            latency,
            error: error.message,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}
