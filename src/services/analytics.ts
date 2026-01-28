
import { db } from '@/lib/firebase/config';
import { collection, query, getDocs, orderBy, where } from 'firebase/firestore';
import type { Product } from '@/lib/types';

export async function getSalesAnalytics() {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);

    const salesByDate: Record<string, { name: string, sales: number, revenue: number }> = {};

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const date = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        if (!salesByDate[dateStr]) {
            salesByDate[dateStr] = { name: dateStr, sales: 0, revenue: 0 };
        }

        salesByDate[dateStr].sales += 1;
        salesByDate[dateStr].revenue += Number(data.totalAmount || data.amount || 0);
    });

    return Object.values(salesByDate);
}

export async function getCategoryDistribution() {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('isDraft', '==', false));
    const snapshot = await getDocs(q);

    const distribution: Record<string, number> = {};

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const category = data.category || 'Uncategorized';
        distribution[category] = (distribution[category] || 0) + 1;
    });

    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
}
