'use server';

import { firestoreDb as db, auth as adminAuth } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { serializeFirestoreData } from '@/lib/utils';

export interface DraftListingData {
    sellerId: string;
    title: string;
    description?: string;
    price: number;
    category: string;
    subCategory?: string;
    condition: string;
    quantity: number;
    isReverseBidding: boolean;
    autoRepricingEnabled: boolean;
    isVault: boolean;
    imageUrls: string[];
    status: 'draft' | 'available';
    isDraft: boolean;
    createdAt: FieldValue;
    updatedAt: FieldValue;
    acceptsPayId?: boolean;
    // Sneaker Specifics
    size?: string;
    brand?: string;
    model?: string;
    styleCode?: string;
    colorway?: string;

    // Trading Card Specifics
    year?: number;
    manufacturer?: string;
    cardNumber?: string;
    grade?: string;
    gradingCompany?: string;
    certNumber?: string;

    // Coin Specifics
    denomination?: string;
    mintMark?: string;
    country?: string;
    metal?: string;
    purity?: string;
    weight?: string;

    // Memorabilia Specifics
    dimensions?: string;
    material?: string;
    authentication?: string;
    authenticationNumber?: string;
    signer?: string;
}

/**
 * Creates or updates a draft listing in Firestore.
 * Returns the draft ID.
 */
export async function saveDraftListing(userId: string, data: Omit<DraftListingData, 'sellerId' | 'status' | 'isDraft' | 'createdAt' | 'updatedAt'>, draftId?: string): Promise<string> {
    if (!userId) {
        throw new Error("Unauthorized: User ID is required.");
    }

    // Verify user role
    let isSuperAdmin = false;
    try {
        const user = await adminAuth.getUser(userId);
        const role = user.customClaims?.role;
        isSuperAdmin = role === 'superadmin' || role === 'admin';
    } catch (e) {
        console.warn('Failed to verify user role for saveDraftListing', e);
    }

    let listingData: any = {
        ...data,
        status: 'draft',
        isDraft: true,
        updatedAt: FieldValue.serverTimestamp(),
    };

    // Auto-apply Bronze Multibuy for cards < $5
    if (listingData.category === 'Collector Cards' && Number(listingData.price) < 5 && Number(listingData.price) > 0) {
        listingData.multibuyEnabled = true;
        listingData.multiCardTier = 'bronze';
    }

    try {
        if (draftId) {
            // Update existing draft
            const docRef = db.collection('products').doc(draftId);
            const docSnap = await docRef.get();

            if (docSnap.exists) {
                const existingData = docSnap.data();
                if (existingData?.sellerId !== userId && existingData?.userId !== userId && !isSuperAdmin) {
                    throw new Error("Unauthorized: You do not own this listing.");
                }

                // If Admin is saving, preserve the original sellerId
                if (isSuperAdmin && existingData?.sellerId) {
                    listingData.sellerId = existingData.sellerId;
                } else {
                    listingData.sellerId = userId;
                }
            } else {
                listingData.sellerId = userId;
            }

            await docRef.set(listingData, { merge: true });
            return draftId;
        } else {
            // Create new draft
            const docRef = await db.collection('products').add({
                ...listingData,
                sellerId: userId,
                createdAt: FieldValue.serverTimestamp(),
            });
            return docRef.id;
        }
    } catch (error: any) {
        console.error("Error saving draft listing:", error);
        throw new Error(error.message || "Failed to save draft listing.");
    }
}

/**
 * Retrieves a draft listing by ID.
 * Ensures the listing belongs to the user or user is admin.
 */
export async function getDraftListing(draftId: string, userId: string): Promise<any> {
    if (!draftId || !userId) return null;

    try {
        const user = await adminAuth.getUser(userId);
        const isSuperAdmin = user.customClaims?.role === 'superadmin' || user.customClaims?.role === 'admin';

        const docSnap = await db.collection('products').doc(draftId).get();

        if (!docSnap.exists) {
            throw new Error("Listing not found.");
        }

        const data = docSnap.data();
        if (data?.sellerId !== userId && data?.userId !== userId && !isSuperAdmin) {
            throw new Error("Unauthorized access to this listing.");
        }

        return { id: docSnap.id, ...serializeFirestoreData(data || {}) };
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
    const data = docSnap.data();

    // Verify Admin
    let isSuperAdmin = false;
    try {
        const user = await adminAuth.getUser(userId);
        const role = user.customClaims?.role;
        isSuperAdmin = role === 'superadmin' || role === 'admin';
    } catch (e) { }

    if (docSnap.exists) {
        if (data?.sellerId !== userId && data?.userId !== userId && !isSuperAdmin) {
            throw new Error("Unauthorized or invalid listing.");
        }

        // Use the SELLER'S ID for checks, not necessarily the current user
        const targetUserId = data?.sellerId || userId;
        const userRef = db.collection('users').doc(targetUserId);
        const userSnap = await userRef.get();

        if (!userSnap.exists) throw new Error("User profile not found.");
        const userData = userSnap.data();

        // 1. Check if user is approved seller (Admins/Superadmins bypass this)
        // If checking based on targetUser's role, that's fine.
        const isStaff = ['admin', 'superadmin'].includes(userData?.role);
        // If the publisher is admin, we bypass requirements? 
        // Or do we enforce requirements on the seller? 
        // If admin is publishing for a user, maybe we allow it even if user isn't fully approved?
        // Let's assume if Admin is doing it, it's allowed.

        if (!isSuperAdmin && !isStaff && userData?.sellerStatus !== 'approved') {
            throw new Error("Your seller application is pending approval or has not been submitted.");
        }

        // 2. Check listing limit (Admins/Superadmins bypass)
        if (!isSuperAdmin && !isStaff) {
            const activeListingsQuery = await db.collection('products')
                .where('sellerId', '==', targetUserId)
                .where('isDraft', '==', false)
                .where('status', '==', 'available')
                .get();

            const currentCount = activeListingsQuery.size;
            const limit = userData?.listingLimit || 40;

            if (currentCount >= limit) {
                throw new Error(`You have reached your listing limit of ${limit}. Please upgrade your plan to list more items.`);
            }
        }

        const updateData: any = {
            status: 'available',
            isDraft: false,
            updatedAt: FieldValue.serverTimestamp(),
            sellerName: userData?.displayName || 'Unknown Seller',
            sellerEmail: userData?.email || '',
            sellerAvatar: userData?.photoURL || '',
            sellerVerified: userData?.isVerified || false,
        };

        await docRef.update(updateData);
    } else {
        throw new Error("Listing not found.");
    }
}

