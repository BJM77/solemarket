'use server';

import { firestoreDb as db } from '@/lib/firebase/admin';
import type { ScanHistoryItem, Player } from '@/lib/research-types';
import { serializeFirestoreData } from "@/lib/utils/serialization";
import { QueryDocumentSnapshot, FieldValue } from 'firebase-admin/firestore';
import { requireUidFromToken } from '@/lib/firebase/session-user';

export async function getScanHistory(idToken: string): Promise<ScanHistoryItem[]> {
    const userId = await requireUidFromToken(idToken).catch(() => '');
    if (!userId) return [];

    try {
        const snapshot = await db.collection('users').doc(userId).collection('scans')
            .orderBy('timestamp', 'desc')
            .get();

        if (snapshot.empty) return [];

        return snapshot.docs.map((doc: QueryDocumentSnapshot) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...serializeFirestoreData(data),
                timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp),
            } as ScanHistoryItem;
        });
    } catch (error) {
        console.error('Error fetching scan history:', error);
        return [];
    }
}

export async function getResearchPreferences(idToken: string): Promise<Player[]> {
    const userId = await requireUidFromToken(idToken).catch(() => '');
    if (!userId) return [];
    try {
        const doc = await db.collection('users').doc(userId).collection('research').doc('preferences').get();
        if (doc.exists) {
            return (doc.data()?.keepList || []) as Player[];
        }
        return [];
    } catch (e) {
        console.error('Error fetching research preferences:', e);
        return [];
    }
}

export async function addPlayerToKeepList(idToken: string, player: Player): Promise<void> {
    const userId = await requireUidFromToken(idToken);
    if (!userId) return;
    try {
        await db.collection('users').doc(userId).collection('research').doc('preferences').set({
            keepList: FieldValue.arrayUnion(player)
        }, { merge: true });
    } catch (e) {
        console.error('Error adding player to keep list:', e);
        throw e;
    }
}

export async function removePlayerFromKeepList(idToken: string, playerName: string): Promise<void> {
    const userId = await requireUidFromToken(idToken);
    if (!userId) return;
    try {
        const ref = db.collection('users').doc(userId).collection('research').doc('preferences');
        const doc = await ref.get();
        if (doc.exists) {
            const list = (doc.data()?.keepList || []) as Player[];
            const newList = list.filter(p => p.name !== playerName);
            await ref.update({ keepList: newList });
        }
    } catch (e) {
        console.error('Error removing player from keep list:', e);
        throw e;
    }
}
