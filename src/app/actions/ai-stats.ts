'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { startOfHour, startOfDay, startOfWeek, format, subDays } from 'date-fns';

export interface AIUsageStats {
    totalUnits: number;
    totalCost: number;
    hourly: { label: string; units: number; cost: number }[];
    daily: { label: string; units: number; cost: number }[];
    weekly: { label: string; units: number; cost: number }[];
    byFeature: { feature: string; units: number; cost: number }[];
}

export async function getAIUsageStats(idToken: string): Promise<AIUsageStats> {
    const decodedToken = await verifyIdToken(idToken);

    // Authorization check
    const userSnap = await firestoreDb.collection('users').doc(decodedToken.uid).get();
    const userData = userSnap.data();
    if (userData?.role !== 'superadmin') {
        throw new Error('Unauthorized: Admin access required.');
    }

    // Fetch logs from the last 30 days
    const thirtyDaysAgo = subDays(new Date(), 30);
    const snapshot = await firestoreDb.collection('ai_usage_logs')
        .where('timestamp', '>=', thirtyDaysAgo)
        .orderBy('timestamp', 'desc')
        .get();

    const logs = snapshot.docs.map(doc => ({
        ...(doc.data() as any),
        id: doc.id,
        timestamp: doc.data().timestamp.toDate()
    }));

    let totalUnits = 0;
    let totalCost = 0;
    const hourlyMap = new Map();
    const dailyMap = new Map();
    const weeklyMap = new Map();
    const featureMap = new Map();

    // Last 24 hours for hourly
    const oneDayAgo = subDays(new Date(), 1);

    logs.forEach(log => {
        totalUnits += log.units;
        totalCost += log.estimatedCost || 0;

        // Group by Feature
        const feat = log.feature || 'Unknown';
        const featData = featureMap.get(feat) || { units: 0, cost: 0 };
        featData.units += log.units;
        featData.cost += log.estimatedCost || 0;
        featureMap.set(feat, featData);

        // Hourly (last 24h)
        if (log.timestamp >= oneDayAgo) {
            const hourKey = format(startOfHour(log.timestamp), 'HH:00');
            const hData = hourlyMap.get(hourKey) || { units: 0, cost: 0 };
            hData.units += log.units;
            hData.cost += log.estimatedCost || 0;
            hourlyMap.set(hourKey, hData);
        }

        // Daily (last 30d)
        const dayKey = format(startOfDay(log.timestamp), 'MMM dd');
        const dData = dailyMap.get(dayKey) || { units: 0, cost: 0 };
        dData.units += log.units;
        dData.cost += log.estimatedCost || 0;
        dailyMap.set(dayKey, dData);

        // Weekly (last 30d)
        const weekKey = `Week of ${format(startOfWeek(log.timestamp), 'MMM dd')}`;
        const wData = weeklyMap.get(weekKey) || { units: 0, cost: 0 };
        wData.units += log.units;
        wData.cost += log.estimatedCost || 0;
        weeklyMap.set(weekKey, wData);
    });

    return {
        totalUnits,
        totalCost,
        hourly: Array.from(hourlyMap.entries()).map(([label, data]) => ({ label, ...data })),
        daily: Array.from(dailyMap.entries()).map(([label, data]) => ({ label, ...data })).reverse(),
        weekly: Array.from(weeklyMap.entries()).map(([label, data]) => ({ label, ...data })).reverse(),
        byFeature: Array.from(featureMap.entries()).map(([feature, data]) => ({ feature, ...data }))
    };
}
