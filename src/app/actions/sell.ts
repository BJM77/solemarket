'use server';

import { firestoreDb as db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { serializeFirestoreDoc } from '@/lib/firebase/serializers';

export interface DraftListingData {
    userId: string;
    title: string;
    description: string;
    price: number;
    category: string;
    subCategory?: string;
    condition: string;
    manufacturer?: string;
    year?: number;
    cardNumber?: string;
    quantity: number;
    isReverseBidding: boolean;
    autoRepricingEnabled: boolean;
    isVault: boolean;
    imageUrls: string[];
    status: 'draft' | 'available';
    createdAt: FieldValue;
    updatedAt: FieldValue;
}

/**
 * Creates or updates a draft listing in Firestore.
 * Returns the draft ID.
 */
export async function saveDraftListing(userId: string, data: Omit<DraftListingData, 'userId' | 'status' | 'createdAt' | 'updatedAt'>, draftId?: string): Promise<string> {
    if (!userId) {
        throw new Error("Unauthorized: User ID is required.");
    }

    const listingData = {
        ...data,
        userId,
        status: 'draft',
        updatedAt: FieldValue.serverTimestamp(),
    };

    try {
        if (draftId) {
            // Update existing draft
            await db.collection('products').doc(draftId).set(listingData, { merge: true });
            return draftId;
        } else {
            // Create new draft
            const docRef = await db.collection('products').add({
                ...listingData,
                createdAt: FieldValue.serverTimestamp(),
            });
            return docRef.id;
        }
    } catch (error) {
        console.error("Error saving draft listing:", error);
        throw new Error("Failed to save draft listing.");
    }
}

/**
 * Retrieves a draft listing by ID.
 * Ensures the listing belongs to the user.
 */
export async function getDraftListing(draftId: string, userId: string): Promise<any> {
    if (!draftId || !userId) return null;

    try {
        const docSnap = await db.collection('products').doc(draftId).get();

        if (!docSnap.exists) {
            throw new Error("Listing not found.");
        }

        const data = docSnap.data();
        if (data?.userId !== userId) {
            throw new Error("Unauthorized access to this listing.");
        }

        return { id: docSnap.id, ...serializeFirestoreDoc(data) };
    } catch (error) {
        console.error("Error fetching draft:", error);
        throw error;
    }
}

/**
 * Publishes a draft listing.
 */
export async function publishListing(draftId: string, userId: string): Promise<void> {
    if (!draftId || !userId) throw new Error("Invalid request.");

    const docRef = db.collection('products').doc(draftId);
    const docSnap = await docRef.get();

    if (!docSnap.exists || docSnap.data()?.userId !== userId) {
        throw new Error("Unauthorized or invalid listing.");
    }

    await docRef.update({
        status: 'available',
        updatedAt: FieldValue.serverTimestamp(),
        isDraft: false
    });
}
