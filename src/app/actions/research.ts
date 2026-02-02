'use server';

import { firestoreDb as db } from '@/lib/firebase/admin';
import { defaultPlayers } from '@/lib/research-types';
import type { Player, ScanHistoryItem } from '@/lib/research-types';

// Helper to get user ref
const getUserRef = (uid: string) => db.collection('users').doc(uid);

/**
 * Get the list of players to keep for a specific user.
 * Stored in users/{uid}/research/preferences
 */
export async function getResearchPreferences(uid: string): Promise<Player[]> {
    try {
        const docRef = getUserRef(uid).collection('research').doc('preferences');
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            // Initialize with defaults if not exists
            await docRef.set({ namesToKeep: defaultPlayers });
            return defaultPlayers;
        }

        const data = docSnap.data();
        return (data?.namesToKeep as Player[]) || defaultPlayers;
    } catch (error) {
        console.error('Error fetching research preferences:', error);
        return defaultPlayers;
    }
}

/**
 * Add a player to the keep list.
 */
export async function addPlayerToKeepList(uid: string, player: Player): Promise<Player[]> {
    try {
        const docRef = getUserRef(uid).collection('research').doc('preferences');
        const docSnap = await docRef.get();

        let currentList: Player[] = defaultPlayers;
        if (docSnap.exists) {
            const data = docSnap.data();
            currentList = (data?.namesToKeep as Player[]) || defaultPlayers;
        }

        // Check strict duplication
        if (currentList.some(p => p.name.toLowerCase() === player.name.toLowerCase())) {
            return currentList;
        }

        const newList = [...currentList, player].sort((a, b) => a.name.localeCompare(b.name));

        await docRef.set({ namesToKeep: newList }, { merge: true });
        return newList;
    } catch (error) {
        console.error('Error adding player to keep list:', error);
        throw new Error('Failed to update keep list');
    }
}

/**
 * Remove a player from the keep list.
 */
export async function removePlayerFromKeepList(uid: string, playerName: string): Promise<Player[]> {
    try {
        const docRef = getUserRef(uid).collection('research').doc('preferences');
        const docSnap = await docRef.get();

        if (!docSnap.exists) return defaultPlayers;

        const data = docSnap.data();
        const currentList = (data?.namesToKeep as Player[]) || defaultPlayers;

        const newList = currentList.filter(p => p.name !== playerName);

        await docRef.set({ namesToKeep: newList }, { merge: true });
        return newList;
    } catch (error) {
        console.error('Error removing player from keep list:', error);
        throw new Error('Failed to update keep list');
    }
}

/**
 * Bulk add multiple players to the keep list at once.
 */
export async function bulkAddPlayersToKeepList(uid: string, players: Player[]): Promise<Player[]> {
    try {
        const docRef = getUserRef(uid).collection('research').doc('preferences');
        const docSnap = await docRef.get();

        let currentList: Player[] = defaultPlayers;
        if (docSnap.exists) {
            const data = docSnap.data();
            currentList = (data?.namesToKeep as Player[]) || defaultPlayers;
        }

        // Filter out duplicates (case-insensitive)
        const existingNames = new Set(currentList.map(p => p.name.toLowerCase()));
        const newPlayers = players.filter(p => !existingNames.has(p.name.toLowerCase()));

        if (newPlayers.length === 0) {
            console.log('All players already exist in the keep list');
            return currentList;
        }

        // Merge and sort
        const newList = [...currentList, ...newPlayers].sort((a, b) => a.name.localeCompare(b.name));

        await docRef.set({ namesToKeep: newList }, { merge: true });
        console.log(`Added ${newPlayers.length} new players to keep list`);
        return newList;
    } catch (error) {
        console.error('Error bulk adding players to keep list:', error);
        throw new Error('Failed to bulk update keep list');
    }
}


/**
 * Fetch scan history for a user.
 * Stored in users/{uid}/scan_history subcollection
 */
export async function getScanHistory(uid: string): Promise<ScanHistoryItem[]> {
    try {
        const historyRef = getUserRef(uid).collection('scan_history').orderBy('timestamp', 'desc').limit(100);
        const snapshot = await historyRef.get();

        const history: ScanHistoryItem[] = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                timestamp: data.timestamp.toDate(), // Convert Firestore Timestamp to JS Date
            } as ScanHistoryItem;
        });

        return history;
    } catch (error) {
        console.error('Error fetching scan history:', error);
        return [];
    }
}

/**
 * Add a new scan result to history.
 */
export async function addScanResult(uid: string, result: ScanHistoryItem): Promise<void> {
    try {
        const historyRef = getUserRef(uid).collection('scan_history').doc(result.id);

        // Ensure timestamp is a Date object or Firestore Timestamp compatible format
        const dataToSave = {
            ...result,
            timestamp: new Date(), // Always use server time or fresh date
        };

        await historyRef.set(dataToSave);
    } catch (error) {
        console.error('Error saving scan result:', error);
        throw new Error('Failed to save scan result');
    }
}

/**
 * Delete a scan history item.
 */
export async function deleteScanResult(uid: string, scanId: string): Promise<void> {
    try {
        await getUserRef(uid).collection('scan_history').doc(scanId).delete();
    } catch (error) {
        console.error('Error deleting scan result:', error);
        throw new Error('Failed to delete history item');
    }
}
