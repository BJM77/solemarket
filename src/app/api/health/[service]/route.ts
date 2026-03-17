
import { NextRequest, NextResponse } from 'next/server';
import { firestoreDb, auth } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { SUPER_ADMIN_EMAILS, SUPER_ADMIN_UIDS } from '@/lib/constants';

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ service: string }> }
) {
    const params = await props.params;
    const { service } = params;
    const start = Date.now();

    // 1. Check for Health Secret (for external monitors)
    const healthSecret = process.env.HEALTH_CHECK_SECRET;
    const incomingSecret = request.headers.get('x-health-check-secret');
    let isAuthorized = healthSecret && incomingSecret === healthSecret;

    // 2. Check for Admin Auth (for dashboard users)
    if (!isAuthorized) {
        const authHeader = request.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
            try {
                const token = authHeader.split('Bearer ')[1];
                const decodedToken = await verifyIdToken(token);
                
                // Check if user is a super admin in hardcoded lists
                let isSuperAdmin = 
                    SUPER_ADMIN_UIDS.includes(decodedToken.uid) || 
                    (decodedToken.email && SUPER_ADMIN_EMAILS.includes(decodedToken.email));
                
                // If not in lists, check Firestore
                if (!isSuperAdmin) {
                    const userDoc = await firestoreDb.collection('users').doc(decodedToken.uid).get();
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        isSuperAdmin = 
                            userData?.isAdmin === true || 
                            userData?.role === 'admin' || 
                            userData?.role === 'superadmin' ||
                            userData?.isSuperAdmin === true;
                    }
                }
                
                if (isSuperAdmin) {
                    isAuthorized = true;
                }
            } catch (e) {
                console.error('Health check auth failed:', e);
            }
        }
    }

    if (!isAuthorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        let status = 'unknown';
        let details: any = {};

        const cleanKey = (key: string | undefined) => {
            if (!key) return undefined;
            let k = key.trim();
            if (k.startsWith('"') && k.endsWith('"')) k = k.slice(1, -1);
            if (k.startsWith("'") && k.endsWith("'")) k = k.slice(1, -1);
            return k;
        };

        switch (service) {
            case 'ai':
                // Check if API key is configured
                const apiKey = cleanKey(process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
                if (apiKey && apiKey.length > 10) {
                    status = 'healthy';
                } else {
                    status = 'degraded';
                    details.error = 'Missing or invalid AI API Key (GOOGLE_GENAI_API_KEY or GEMINI_API_KEY)';
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
                if (cleanKey(process.env.STRIPE_SECRET_KEY)) {
                    status = 'healthy';
                } else {
                    status = 'degraded';
                    details.message = 'Stripe key not configured';
                    // Not critical for app start, but reported
                }
                break;

            case 'email':
                if (cleanKey(process.env.SENDGRID_API_KEY)) {
                    status = 'healthy';
                    details.provider = 'SendGrid';
                } else if (cleanKey(process.env.RESEND_API_KEY)) {
                    status = 'healthy';
                    details.provider = 'Resend';
                } else {
                    status = 'degraded';
                    details.message = 'Email service (SendGrid) key not configured';
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
