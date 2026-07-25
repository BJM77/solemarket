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

        // Clear any guest holds associated with this email
        if (email) {
            const guestId = `guest_${email.replace(/\./g, '_')}`;
            const heldProductsQuery = await firestoreDb.collection('products').where('heldBy', '==', guestId).get();
            if (!heldProductsQuery.empty) {
                const batch = firestoreDb.batch();
                heldProductsQuery.docs.forEach((doc: any) => {
                    batch.update(doc.ref, {
                        heldBy: null,
                        holdExpiresAt: null
                    });
                });
                await batch.commit();
                console.log(`[Auth Sync] Cleared ${heldProductsQuery.size} guest holds for ${email}`);
            }
        }

        // Identify role from Firestore document (fallback to env variables if set in constants)
        let role = 'buyer';
        if (userSnap.exists) {
            const data = userSnap.data();
            if (data?.role === 'superadmin' || data?.isSuperAdmin === true) {
                role = 'superadmin';
            } else if (data?.role === 'admin' || data?.isAdmin === true) {
                role = 'admin';
            } else if (data?.canSell === true || data?.accountType === 'seller') {
                role = 'seller';
            }
        }

        // If the user's email/UID is in the env-configured super admins, elevate them
        const isSuperAdminUser = SUPER_ADMIN_UIDS.includes(uid) || (email && SUPER_ADMIN_EMAILS.includes(email));
        if (isSuperAdminUser) {
            role = 'superadmin';
        }

        console.log(`[Auth Sync] Syncing claims for ${uid} with role: ${role}`);

        // 1. Set Custom Claims for Security Rules
        const { authAdmin } = await import('@/lib/firebase/admin');
        await authAdmin.setCustomUserClaims(uid, { role });

        // 2. Sync Firestore Profile
        const updatePayload: any = {
            email,
            displayName,
            role,
        };
        if (role === 'superadmin' || role === 'admin') {
            updatePayload.isAdmin = true;
            updatePayload.accountType = 'seller';
            updatePayload.canSell = true;
        }

        if (!userSnap.exists) {
            updatePayload.createdAt = new Date();
        }

        await userRef.set(updatePayload, { merge: true });
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

        return { success: true };
    } catch (error: any) {
        console.error("Error syncing user:", error);
        return { success: false, error: error.message };
    }
}
