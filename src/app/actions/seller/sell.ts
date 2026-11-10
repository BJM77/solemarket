'use server';

import { resolveSellerName } from '@/lib/utils/seller-name';
import { firestoreDb as db, auth as adminAuth } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { serializeFirestoreData } from "@/lib/utils/serialization";
import { checkForAdminWantedMatch } from '../admin/admin-wanted';
import { requireUidFromToken } from '@/lib/firebase/session-user';
import { determineProductStorefrontId } from '@/config/storefronts';

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
    autoAcceptPrice?: number;
    floorPrice?: number;
    isVault: boolean;
    imageUrls: string[];
    status: 'draft' | 'available';
    isDraft: boolean;
    
    // Dutch Auction
    isDutchAuction?: boolean;
    dutchAuctionDropAmount?: number;
    dutchAuctionIntervalHours?: number;
    dutchAuctionFloorPrice?: number;
    dutchAuctionStartTime?: FieldValue;
    
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
export async function saveDraftListing(idToken: string, data: Omit<DraftListingData, 'sellerId' | 'status' | 'isDraft' | 'createdAt' | 'updatedAt'>, draftId?: string): Promise<string> {
    // The seller is whoever the verified ID token says, never a client-supplied uid.
    const userId = await requireUidFromToken(idToken);
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
        isFeatured: false,
        isPromoted: false,
        storefrontId: (data as any)?.storefrontId || determineProductStorefrontId(data),
        updatedAt: FieldValue.serverTimestamp(),
    };

    // Sanitize to remove undefined values, which causes Firestore Admin to crash
    Object.keys(listingData).forEach(key => {
        if (listingData[key] === undefined) {
            delete listingData[key];
        }
    });

    // Multibuy tiers are seller input: clamp to 0-90% and drop junk.
    if (listingData.multibuyTiers !== undefined) {
        const { sanitizeMultibuyTiers } = await import('@/lib/pricing');
        listingData.multibuyTiers = sanitizeMultibuyTiers(listingData.multibuyTiers);
    }
    // Bronze/Silver/Gold bundle tiers only apply to Cards and Coins; a tiered listing is
    // always shown on /multibuy. Cheap cards (< $5) default to Bronze unless the seller
    // explicitly cleared the tier (null).
    const { isBundleTier, tierGroupFor } = await import('@/lib/tier-bundles');
    const tierGroup = tierGroupFor(listingData.category);
    if (listingData.multiCardTier === '') listingData.multiCardTier = null;
    if (!tierGroup && isBundleTier(listingData.multiCardTier)) listingData.multiCardTier = null;
    if (tierGroup === 'cards' && listingData.multiCardTier === undefined && Number(listingData.price) < 5 && Number(listingData.price) > 0) {
        listingData.multiCardTier = 'bronze';
    }
    if (listingData.multibuyEnabled && !listingData.multibuyTiers?.length) {
        listingData.multibuyEnabled = false;
    }
    if (tierGroup && isBundleTier(listingData.multiCardTier)) {
        listingData.multibuyEnabled = true;
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
export async function getDraftListing(draftId: string, idToken: string): Promise<any> {
    if (!draftId) return null;
    const userId = await requireUidFromToken(idToken);

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
export async function publishListing(draftId: string, idToken: string): Promise<void> {
    if (!draftId) throw new Error("Invalid request.");
    const userId = await requireUidFromToken(idToken);
    const { publishListingAs } = await import('@/lib/listings/publish-core');
    await publishListingAs(draftId, userId);
    await kickAlerts();
}

/** Nudge the saved-search alerts worker (best effort, never throws). */
async function kickAlerts() {
    try {
        const { kickSavedSearchAlerts } = await import('@/lib/jobs/saved-search-alerts');
        await kickSavedSearchAlerts();
    } catch { /* the scheduled run picks it up */ }
}

/**
 * Publishes up to 50 draft listings in one request. The client sends larger sets in chunks
 * and must stay open until every chunk finishes.
 */
export async function publishBatchListingsAction(
    draftIds: string[],
    idToken: string
): Promise<{ published: string[]; errors: Record<string, string> }> {
    if (!Array.isArray(draftIds) || draftIds.length === 0 || !draftIds.every((id) => typeof id === 'string' && id.length > 0)) {
        throw new Error('draftIds must be a non-empty array of ids.');
    }
    if (typeof idToken !== 'string' || !idToken) throw new Error('Not signed in.');
    const ids = [...new Set(draftIds)].slice(0, 50);
    const published: string[] = [];
    const errors: Record<string, string> = {};
    const userId = await requireUidFromToken(idToken);
    const { publishListingAs } = await import('@/lib/listings/publish-core');
    for (const id of ids) {
        try {
            await publishListingAs(id, userId);
            published.push(id);
        } catch (e: any) {
            errors[id] = e?.message || 'Publish failed';
        }
    }
    if (published.length) await kickAlerts();
    return { published, errors };
}

/** Tiers of the admin's default multibuy template (empty if none). */
async function getDefaultMultibuyTiers() {
    try {
        const { sanitizeMultibuyTiers } = await import('@/lib/pricing');
        const snap = await db.collection('multibuy_templates').where('isDefault', '==', true).limit(1).get();
        return snap.empty ? [] : sanitizeMultibuyTiers(snap.docs[0].data()?.tiers);
    } catch {
        return [];
    }
}
