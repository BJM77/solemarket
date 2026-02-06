'use server';

import { firestoreDb as db, auth } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { WantedListing, WTBMessage } from '@/lib/types';

// Helper to verify ID token
async function verifyIdToken(idToken: string) {
    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        return decodedToken;
    } catch (error) {
        console.error('Error verifying ID token:', error);
        return null;
    }
}

/**
 * Create a new WTB listing
 */
export async function createWTBListing(
    data: Omit<WantedListing, 'id' | 'createdAt' | 'updatedAt' | 'contactCount'>,
    idToken: string
) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        if (!decodedToken) {
            return { success: false, error: 'Unauthorized' };
        }

        // Verify user is verified or is super admin
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        const userData = userDoc.data();

        const isSuperAdmin = userData?.isSuperAdmin || userData?.isAdmin || userData?.role === 'superadmin';

        if (!userData?.isVerified && !isSuperAdmin) {
            return { success: false, error: 'You must be verified to create WTB listings' };
        }

        const wtbRef = db.collection('wanted_listings').doc();
        const wtbListing: WantedListing = {
            ...data,
            id: wtbRef.id,
            userId: decodedToken.uid,
            createdAt: FieldValue.serverTimestamp() as any,
            updatedAt: FieldValue.serverTimestamp() as any,
            contactCount: 0,
            status: 'active',
        };

        await wtbRef.set(wtbListing);

        return { success: true, id: wtbRef.id };
    } catch (error: any) {
        console.error('Error creating WTB listing:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update an existing WTB listing
 */
export async function updateWTBListing(
    listingId: string,
    data: Partial<Omit<WantedListing, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
    idToken: string
) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        if (!decodedToken) {
            return { success: false, error: 'Unauthorized' };
        }

        const wtbRef = db.collection('wanted_listings').doc(listingId);
        const wtbDoc = await wtbRef.get();

        if (!wtbDoc.exists) {
            return { success: false, error: 'Listing not found' };
        }

        const wtbData = wtbDoc.data() as WantedListing;
        if (wtbData.userId !== decodedToken.uid) {
            return { success: false, error: 'Unauthorized to edit this listing' };
        }

        await wtbRef.update({
            ...data,
            updatedAt: FieldValue.serverTimestamp(),
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error updating WTB listing:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete a WTB listing
 */
export async function deleteWTBListing(listingId: string, idToken: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        if (!decodedToken) {
            return { success: false, error: 'Unauthorized' };
        }

        const wtbRef = db.collection('wanted_listings').doc(listingId);
        const wtbDoc = await wtbRef.get();

        if (!wtbDoc.exists) {
            return { success: false, error: 'Listing not found' };
        }

        const wtbData = wtbDoc.data() as WantedListing;
        if (wtbData.userId !== decodedToken.uid) {
            return { success: false, error: 'Unauthorized to delete this listing' };
        }

        await wtbRef.delete();

        return { success: true };
    } catch (error: any) {
        console.error('Error deleting WTB listing:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get WTB listings with optional filters (public)
 */
export async function getWTBListings(filters?: {
    category?: string;
    maxPrice?: number;
    condition?: string;
    status?: string;
    limit?: number;
}) {
    try {
        let query = db.collection('wanted_listings')
            .where('status', '==', filters?.status || 'active')
            .orderBy('createdAt', 'desc');

        if (filters?.category) {
            query = query.where('category', '==', filters.category) as any;
        }

        if (filters?.maxPrice) {
            query = query.where('maxPrice', '<=', filters.maxPrice) as any;
        }

        const snapshot = await query.limit(filters?.limit || 50).get();
        const listings: WantedListing[] = [];

        snapshot.forEach(doc => {
            listings.push({ id: doc.id, ...doc.data() } as WantedListing);
        });

        return { success: true, listings };
    } catch (error: any) {
        console.error('Error fetching WTB listings:', error);
        return { success: false, error: error.message, listings: [] };
    }
}

/**
 * Get a single WTB listing by ID (public)
 */
export async function getWTBListingById(listingId: string) {
    try {
        const wtbDoc = await db.collection('wanted_listings').doc(listingId).get();

        if (!wtbDoc.exists) {
            return { success: false, error: 'Listing not found' };
        }

        const listing = { id: wtbDoc.id, ...wtbDoc.data() } as WantedListing;
        return { success: true, listing };
    } catch (error: any) {
        console.error('Error fetching WTB listing:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get user's own WTB listings
 */
export async function getMyWTBListings(idToken: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        if (!decodedToken) {
            return { success: false, error: 'Unauthorized', listings: [] };
        }

        const snapshot = await db.collection('wanted_listings')
            .where('userId', '==', decodedToken.uid)
            .orderBy('createdAt', 'desc')
            .get();

        const listings: WantedListing[] = [];
        snapshot.forEach(doc => {
            listings.push({ id: doc.id, ...doc.data() } as WantedListing);
        });

        return { success: true, listings };
    } catch (error: any) {
        console.error('Error fetching user WTB listings:', error);
        return { success: false, error: error.message, listings: [] };
    }
}

/**
 * Contact a WTB listing owner (both parties must be verified)
 */
export async function contactWTBSeller(
    wtbListingId: string,
    message: string,
    idToken: string
) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        if (!decodedToken) {
            return { success: false, error: 'Unauthorized' };
        }

        // Verify seller is verified or is super admin
        const sellerDoc = await db.collection('users').doc(decodedToken.uid).get();
        const sellerData = sellerDoc.data();

        if (!sellerData) {
            return { success: false, error: 'User profile not found' };
        }

        const isSuperAdmin = sellerData.isSuperAdmin || sellerData.isAdmin || sellerData.role === 'superadmin' || decodedToken.role === 'superadmin';

        if (!sellerData.isVerified && !isSuperAdmin) {
            return { success: false, error: 'You must be verified to contact buyers' };
        }

        // Get WTB listing
        const wtbDoc = await db.collection('wanted_listings').doc(wtbListingId).get();
        if (!wtbDoc.exists) {
            return { success: false, error: 'Listing not found' };
        }

        const wtbData = wtbDoc.data() as WantedListing;

        // Can't contact own listing
        if (wtbData.userId === decodedToken.uid) {
            return { success: false, error: 'You cannot contact your own listing' };
        }

        // Verify WTB owner is verified
        const wtbUserDoc = await db.collection('users').doc(wtbData.userId).get();
        const wtbUserData = wtbUserDoc.data();

        if (!wtbUserData?.isVerified) {
            return { success: false, error: 'The buyer must be verified to receive messages' };
        }

        // Create message
        const messageRef = db.collection('wtb_messages').doc();
        const wtbMessage: WTBMessage = {
            id: messageRef.id,
            wtbListingId,
            wtbListingTitle: wtbData.title,
            wtbUserId: wtbData.userId,
            wtbUserName: wtbData.userDisplayName,
            sellerId: decodedToken.uid,
            sellerName: sellerData.displayName || 'Anonymous',
            message,
            status: 'pending',
            createdAt: FieldValue.serverTimestamp() as any,
        };

        await messageRef.set(wtbMessage);

        // Increment contact count on listing
        await db.collection('wanted_listings').doc(wtbListingId).update({
            contactCount: FieldValue.increment(1),
        });

        return { success: true, messageId: messageRef.id };
    } catch (error: any) {
        console.error('Error contacting WTB seller:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get messages for a specific WTB listing (for listing owner)
 */
export async function getWTBMessages(wtbListingId: string, idToken: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        if (!decodedToken) {
            return { success: false, error: 'Unauthorized', messages: [] };
        }

        // Verify user owns the listing or is the seller
        const snapshot = await db.collection('wtb_messages')
            .where('wtbListingId', '==', wtbListingId)
            .orderBy('createdAt', 'desc')
            .get();

        const messages: WTBMessage[] = [];
        snapshot.forEach((doc: any) => {
            const msgData = doc.data() as WTBMessage;
            // Only return if user is involved
            if (msgData.wtbUserId === decodedToken.uid || msgData.sellerId === decodedToken.uid) {
                messages.push({ ...msgData, id: doc.id });
            }
        });

        return { success: true, messages };
    } catch (error: any) {
        console.error('Error fetching WTB messages:', error);
        return { success: false, error: error.message, messages: [] };
    }
}

/**
 * Mark WTB listing as fulfilled
 */
export async function markWTBFulfilled(listingId: string, idToken: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        if (!decodedToken) {
            return { success: false, error: 'Unauthorized' };
        }

        const wtbRef = db.collection('wanted_listings').doc(listingId);
        const wtbDoc = await wtbRef.get();

        if (!wtbDoc.exists) {
            return { success: false, error: 'Listing not found' };
        }

        const wtbData = wtbDoc.data() as WantedListing;
        if (wtbData.userId !== decodedToken.uid) {
            return { success: false, error: 'Unauthorized' };
        }

        await wtbRef.update({
            status: 'fulfilled',
            updatedAt: FieldValue.serverTimestamp(),
        });

        return { success: true };
    } catch (error: any) {
        console.error('Error marking WTB fulfilled:', error);
        return { success: false, error: error.message };
    }
}
