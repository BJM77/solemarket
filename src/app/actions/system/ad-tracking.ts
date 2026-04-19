'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function trackAdImpressionAction(adId: string) {
    if (!adId) return;
    try {
        await firestoreDb.collection('ads').doc(adId).update({
            impressions: FieldValue.increment(1)
        });
    } catch (error) {
        console.error('Failed to track impression:', error);
    }
}

export async function trackAdClickAction(adId: string) {
    if (!adId) return;
    try {
        await firestoreDb.collection('ads').doc(adId).update({
            clicks: FieldValue.increment(1)
        });
    } catch (error) {
        console.error('Failed to track click:', error);
    }
}
