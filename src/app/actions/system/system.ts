'use server';

import { isFirebaseAdminReady } from '@/lib/firebase/admin';
import { isAIReady } from '@/ai/genkit';
import { verifyIdToken } from '@/lib/firebase/auth-admin';

export async function getSystemStatus(idToken: string) {
    try {
        // Verify the user is an admin
        await verifyIdToken(idToken);

        return {
            firebaseAdmin: isFirebaseAdminReady,
            ai: isAIReady,
            environment: process.env.NODE_ENV,
            isProduction: process.env.NODE_ENV === 'production',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return { error: 'Unauthorized profile' };
    }
}
