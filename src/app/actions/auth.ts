'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { SUPER_ADMIN_EMAILS, SUPER_ADMIN_UIDS } from '@/lib/constants';
import { verifyIdToken } from '@/lib/firebase/auth-admin';

export async function syncUserOnLogin(idToken: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const email = decodedToken.email;
        const displayName = decodedToken.name || 'User';

        const userRef = firestoreDb.collection('users').doc(uid);
        const userSnap = await userRef.get();

        // Identify super admin
        const isSuperAdminUser = SUPER_ADMIN_UIDS.includes(uid) || (email && SUPER_ADMIN_EMAILS.includes(email));

        if (isSuperAdminUser) {
            if (userSnap.exists && (!userSnap.data()?.isAdmin || userSnap.data()?.role !== 'superadmin')) {
                await userRef.set({ isAdmin: true, role: 'superadmin', canSell: true }, { merge: true });
            } else if (!userSnap.exists) {
                await userRef.set({
                    email,
                    displayName,
                    isAdmin: true,
                    role: 'superadmin',
                    canSell: true,
                    createdAt: new Date(),
                }, { merge: true });
            }

            // Initialize stats if needed
            const statsRef = firestoreDb.collection('platform_stats').doc('global');
            const statsSnap = await statsRef.get();
            if (!statsSnap.exists) {
                await statsRef.set({
                    totalRevenue: 0,
                    activeSellers: 0,
                    disputeCount: 0,
                    totalItems: 0,
                });
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error syncing user:", error);
        return { success: false, error: error.message };
    }
}
