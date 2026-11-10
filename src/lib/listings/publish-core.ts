import 'server-only';
import { resolveSellerName } from '@/lib/utils/seller-name';
import { firestoreDb as db, auth as adminAuth } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { checkForAdminWantedMatch } from '@/app/actions/admin/admin-wanted';
import { determineProductStorefrontId } from '@/config/storefronts';

/**
 * Publish one draft on behalf of an already-authenticated user. Runs every
 * per-listing check (ownership, seller approval, price, listing limit,
 * wanted-list hold). Not a server action: callers must authenticate first.
 */
export async function publishListingAs(draftId: string, userId: string): Promise<void> {
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

        // 1b. A listing can't go live without a title, photo, and real price (reverse-bid/WTB listings excepted).
        if (!String(data?.title || '').trim()) {
            throw new Error("Add a title before publishing.");
        }
        if (!Array.isArray(data?.imageUrls) || data.imageUrls.filter(Boolean).length === 0) {
            throw new Error("Add at least one photo before publishing.");
        }
        if (!data?.isReverseBidding && !(Number(data?.price) > 0)) {
            throw new Error("Set a price above $0 before publishing.");
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
            inCollection: false,
            updatedAt: FieldValue.serverTimestamp(),
            publishedAt: FieldValue.serverTimestamp(),
            storefrontId: data?.storefrontId || determineProductStorefrontId(data),
            sellerName: resolveSellerName(userData as any, data?.sellerName),
            sellerAvatar: userData?.photoURL || '',
            sellerVerified: userData?.isVerified || false,
            isFeatured: data?.isFeatured ?? false,
            isPromoted: data?.isPromoted ?? false,
        };

        if (data.isDutchAuction) {
            updateData.dutchAuctionStartTime = FieldValue.serverTimestamp();
        }

        // Check for Super Admin Personal Wanted list matches
        const isMatch = await checkForAdminWantedMatch(data.title, data.category || 'Sneakers');
        if (isMatch) {
            updateData.status = 'on_hold';
            updateData.holdReason = 'Personal Wanted Match (Super Admin)';
            updateData.adminWantedMatch = true;
        }

        await docRef.update(updateData);

        // Save the price the seller picked next to the scanned card details in `card_price_history`
        // so Benched builds its own first-party pricing history over time without scraping.
        const pickedPrice = Number(data?.price);
        if (pickedPrice > 0 && data?.title) {
            try {
                await db.collection('card_price_history').add({
                    productId: draftId,
                    sellerId: targetUserId,
                    title: String(data.title).trim(),
                    price: pickedPrice,
                    currency: 'AUD',
                    category: data.category || 'Collector Cards',
                    subCategory: data.subCategory || null,
                    brand: data.brand || data.manufacturer || null,
                    model: data.model || (data as any).set || null,
                    year: data.year || null,
                    cardNumber: data.cardNumber || null,
                    condition: data.condition || null,
                    gradingCompany: data.gradingCompany || 'Raw',
                    grade: data.grade || null,
                    recordedAt: FieldValue.serverTimestamp(),
                });
            } catch (e) {
                console.warn('Failed to record card_price_history entry', e);
            }
        }
    } else {
        throw new Error("Listing not found.");
    }
}

