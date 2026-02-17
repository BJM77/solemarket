'use client';

import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, limit as firestoreLimit, getDocs } from 'firebase/firestore';
import type { WantedListing } from '@/lib/types';

/**
 * Get WTB listings with optional filters (public - CLIENT SIDE)
 * This replaces the server action for public browsing to avoid Admin SDK auth issues
 */
export async function getWTBListingsClient(filters?: {
    category?: string;
    maxPrice?: number;
    condition?: string;
    status?: string;
    limit?: number;
}) {
    try {
        const wtbRef = collection(db, 'wanted_listings');
        let constraints: any[] = [
            where('status', '==', filters?.status || 'active'),
            orderBy('createdAt', 'desc'),
            firestoreLimit(filters?.limit || 50)
        ];

        if (filters?.category) {
            constraints.splice(1, 0, where('category', '==', filters.category));
        }

        if (filters?.maxPrice) {
            constraints.splice(1, 0, where('maxPrice', '<=', filters.maxPrice));
        }

        const q = query(wtbRef, ...constraints);
        const snapshot = await getDocs(q);

        const listings: WantedListing[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as WantedListing));

        return { success: true, listings };
    } catch (error: any) {
        console.error('Error fetching WTB listings:', error);
        return { success: false, error: error.message, listings: [] };
    }
}

/**
 * Get a single WTB listing by ID (public - CLIENT SIDE)
 */
export async function getWTBListingByIdClient(listingId: string) {
    try {
        const { getDoc, doc } = await import('firebase/firestore');
        const wtbDoc = await getDoc(doc(db, 'wanted_listings', listingId));

        if (!wtbDoc.exists()) {
            return { success: false, error: 'Listing not found' };
        }

        const listing = { id: wtbDoc.id, ...wtbDoc.data() } as WantedListing;
        return { success: true, listing };
    } catch (error: any) {
        console.error('Error fetching WTB listing:', error);
        return { success: false, error: error.message };
    }
}
