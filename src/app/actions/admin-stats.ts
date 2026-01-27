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

        // 2. Active Sellers (Users with role 'seller' or just total users if roles undefined)
        // For now, let's count all users
        const sellersSnapshot = await firestoreDb.collection('users').count().get();
        const activeSellers = sellersSnapshot.data().count;

        // 3. Total Revenue & Pending Orders
        // We'll approximate this for now if orders collection exists
        let totalRevenue = 0;
        let pendingOrders = 0;

        try {
            const ordersRef = firestoreDb.collection('orders');
            const ordersSnapshot = await ordersRef.get(); // Warning: getting all orders might be heavy later

            // If we have many orders, this should be an aggregation query instead

            // Using logic: if we can, use aggregation for count at least
            const pendingSnapshot = await ordersRef.where('status', '==', 'pending').count().get();
            pendingOrders = pendingSnapshot.data().count;

            // For revenue, we need to sum. Firestore doesn't support sum aggregation natively in all SDK versions yet,
            // but recent Admin SDKs do. Let's try to be safe and just fetch fields if possible, or skip revenue for now
            // to avoid reading all docs.
            // Let's set revenue to 0 for MVP to avoid "Read all docs" cost spike
            totalRevenue = 0;

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
