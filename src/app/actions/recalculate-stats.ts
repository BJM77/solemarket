'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { revalidatePath } from 'next/cache';

export async function recalculatePlatformStats(idToken: string) {
    try {
        // Verify the user is an admin
        await verifyIdToken(idToken);

        // 1. Recalculate Total Items (Available + Pending Approval)
        const productsCountSnap = await firestoreDb.collection('products')
            .where('status', 'in', ['available', 'pending_approval'])
            .count()
            .get();
        const totalItems = productsCountSnap.data().count;

        // 2. Recalculate Active Sellers
        const sellersSnap = await firestoreDb.collection('users')
            .where('accountType', '==', 'seller')
            .count()
            .get();
        const activeSellers = sellersSnap.data().count;

        // 3. Optional: Recalculate Revenue (This would sum all completed orders)
        // For now, let's keep totalRevenue as is or zero if missing
        const statsRef = firestoreDb.collection('platform_stats').doc('global');
        const statsSnap = await statsRef.get();
        const currentData = statsSnap.data() || { totalRevenue: 0 };

        await statsRef.set({
            ...currentData,
            totalItems,
            activeSellers,
            updatedAt: new Date()
        }, { merge: true });

        revalidatePath('/admin');

        return { success: true, totalItems, activeSellers };
    } catch (error: any) {
        console.error("Recalculate stats failed:", error);
        return { success: false, error: error.message };
    }
}
