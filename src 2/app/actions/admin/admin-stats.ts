'use server';

import { firestoreDb } from '@/lib/firebase/admin';

export interface AdminStats {
    totalListings: number;
    activeSellers: number;
    totalRevenue: number;
    pendingOrders: number;
}

export async function getAdminStats(): Promise<AdminStats> {
    try {
        // 1. Total Listings
        const productsSnapshot = await firestoreDb.collection('products').count().get();
        const totalListings = productsSnapshot.data().count;

        // 2. Active Sellers (Users with accountType 'seller')
        const sellersSnapshot = await firestoreDb.collection('users')
            .where('accountType', '==', 'seller')
            .count().get();
        const activeSellers = sellersSnapshot.data().count;

        // 3. Total Revenue & Pending Orders
        // We'll approximate this for now if orders collection exists
        let totalRevenue = 0;
        let pendingOrders = 0;

        try {
            const ordersRef = firestoreDb.collection('orders');
            const ordersSnapshot = await ordersRef.get(); // Warning: getting all orders might be heavy later

            // If we have many orders, this should be an aggregation query instead

            // Fetch revenue from global platform stats doc
            const globalRef = firestoreDb.collection('platform_stats').doc('global');
            const globalSnap = await globalRef.get();
            if (globalSnap.exists) {
                totalRevenue = globalSnap.data()?.totalRevenue || 0;
            }

            const pendingSnapshot = await ordersRef.where('status', '==', 'pending').count().get();
            pendingOrders = pendingSnapshot.data().count;

        } catch (e) {
            console.warn("Could not fetch orders stats:", e);
        }

        return {
            totalListings,
            activeSellers,
            totalRevenue,
            pendingOrders
        };
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        return {
            totalListings: 0,
            activeSellers: 0,
            totalRevenue: 0,
            pendingOrders: 0
        };
    }
}
