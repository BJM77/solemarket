import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, limit, updateDoc, doc, increment, orderBy } from 'firebase/firestore';
import { Advertisement } from '@/lib/types';

import { trackAdImpressionAction, trackAdClickAction } from '@/app/actions/ad-tracking';

export async function getActiveAd(placement: Advertisement['placement']): Promise<Advertisement | null> {
    try {
        const now = new Date();
        const q = query(
            collection(db, 'ads'),
            where('placement', '==', placement),
            where('status', '==', 'active'),
            where('endDate', '>=', now),
            orderBy('endDate', 'asc'), 
            limit(1)
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;

        const adDoc = snapshot.docs[0];
        const adData = { id: adDoc.id, ...adDoc.data() } as Advertisement;

        // Verify startDate
        const startDate = adData.startDate?.toDate ? adData.startDate.toDate() : new Date(adData.startDate as any);
        if (startDate > now) return null;

        return adData;
    } catch (error) {
        console.error(`Error fetching ad for ${placement}:`, error);
        return null;
    }
}

export async function trackAdImpression(adId: string) {
    // Call Server Action to bypass Firestore Rules
    await trackAdImpressionAction(adId);
}

export async function trackAdClick(adId: string) {
    // Call Server Action to bypass Firestore Rules
    await trackAdClickAction(adId);
}
