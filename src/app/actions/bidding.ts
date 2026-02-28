
'use server'

import { firestoreDb, admin as firebaseAdmin } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { Product, Bid } from '@/lib/types';
import { sendNotification } from '@/services/notifications';
import { revalidatePath } from 'next/cache';
import { verifyActionCode } from './email-verification';

export async function placeBidAction(
    productId: string,
    amount: number,
    idToken?: string,
    guestEmail?: string,
    verificationCode?: string,
    paymentMethodId?: string
) {
    try {
        let bidderId: string;
        let bidderName: string;

        if (idToken) {
            const decodedToken = await verifyIdToken(idToken);
            bidderId = decodedToken.uid;
            bidderName = decodedToken.name || 'User';
        } else if (guestEmail && verificationCode) {
            // Verify guest email before proceeding
            const verifyResult = await verifyActionCode(guestEmail, verificationCode);
            if (!verifyResult.success) {
                return { success: false, error: verifyResult.error || "Verification failed" };
            }
            bidderId = `guest_${guestEmail.replace(/\./g, '_')}`;
            bidderName = `Guest (${guestEmail.split('@')[0]})`;
        } else {
            return { success: false, error: "Authentication or Guest Verification required." };
        }

        const result = await firestoreDb.runTransaction(async (transaction: any) => {
            const productRef = firestoreDb.collection('products').doc(productId);
            const productSnap = await transaction.get(productRef);

            if (!productSnap.exists) {
                throw new Error('Product not found');
            }

            const product = productSnap.data() as Product;

            if (!product.isReverseBidding && !product.isNegotiable) {
                throw new Error('This product does not accept bids or offers');
            }

            if (bidderId === product.sellerId) {
                throw new Error("You cannot bid on your own item.");
            }

            if (product.status === 'sold') {
                throw new Error("This item has already been sold.");
            }

            const currentBids = product.bids || [];

            // Identify previous highest bidder for notification
            const sortedBids = [...currentBids].sort((a, b) => b.amount - a.amount);
            const previousHighestBid = sortedBids[0];

            const newBid: Bid = {
                id: crypto.randomUUID(),
                bidderId,
                bidderName: bidderName || 'Anonymous',
                amount,
                timestamp: firebaseAdmin.firestore.Timestamp.now() as any,
                status: 'pending',
                paymentMethodId: paymentMethodId || undefined
            };

            transaction.update(productRef, {
                bids: firebaseAdmin.firestore.FieldValue.arrayUnion(newBid)
            });

            return {
                newBid,
                sellerId: product.sellerId,
                productTitle: product.title,
                previousHighestBidderId: previousHighestBid?.bidderId !== bidderId ? previousHighestBid?.bidderId : null,
                previousHighestAmount: previousHighestBid?.amount
            };
        });

        // Notifications (outside transaction)

        // 1. Notify Seller
        await sendNotification(
            result.sellerId,
            'system',
            'New Offer Received',
            `You received a new offer of $${amount.toLocaleString()} for "${result.productTitle}".`,
            `/product/${productId}`
        );

        // 2. Notify Previous Highest Bidder if outbid
        if (result.previousHighestBidderId && amount > (result.previousHighestAmount || 0)) {
            await sendNotification(
                result.previousHighestBidderId,
                'outbid',
                'You have been outbid!',
                `Someone placed a higher offer of $${amount.toLocaleString()} on "${result.productTitle}".`,
                `/product/${productId}`
            );
        }

        revalidatePath(`/product/${productId}`);
        return { success: true, bid: result.newBid };

    } catch (error: any) {
        console.error('Bid placement failed:', error);
        return { success: false, error: error.message || 'Failed to place offer.' };
    }
}

export async function acceptBidAction(productId: string, idToken: string, bidId: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const { uid: userId } = decodedToken;

        const result = await firestoreDb.runTransaction(async (transaction: any) => {
            const productRef = firestoreDb.collection('products').doc(productId);
            const productSnap = await transaction.get(productRef);

            if (!productSnap.exists) {
                throw new Error('Product not found');
            }

            const product = productSnap.data() as Product;

            // Check authorization: must be seller or admin
            const isSeller = product.sellerId === userId;
            const isStaff = ['admin', 'superadmin'].includes(decodedToken.role);

            if (!isSeller && !isStaff) {
                throw new Error('Unauthorized');
            }

            const bids = product.bids || [];
            const acceptedBid = bids.find(b => b.id === bidId);

            if (!acceptedBid) {
                throw new Error("Bid not found.");
            }

            // Update statuses
            const updatedBids = bids.map(bid => {
                if (bid.id === bidId) {
                    return { ...bid, status: 'accepted' as const };
                }
                if (bid.status === 'pending') {
                    return { ...bid, status: 'rejected' as const };
                }
                return bid;
            });

            transaction.update(productRef, {
                bids: updatedBids,
                acceptedBidId: bidId,
                price: acceptedBid.amount,
                status: 'sold',
                soldAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
            });

            return {
                bidderId: acceptedBid.bidderId,
                productTitle: product.title,
                amount: acceptedBid.amount
            };
        });

        // Notify Buyer
        await sendNotification(
            result.bidderId,
            'system',
            'Offer Accepted!',
            `Your offer of $${result.amount.toLocaleString()} for "${result.productTitle}" has been accepted!`,
            `/profile/orders`
        );

        revalidatePath(`/product/${productId}`);
        return { success: true, message: 'Offer accepted successfully.' };

    } catch (error: any) {
        console.error('Accept bid failed:', error);
        return { success: false, error: error.message || 'Failed to accept offer.' };
    }
}

export async function rejectBidAction(productId: string, idToken: string, bidId: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const { uid: userId } = decodedToken;

        const result = await firestoreDb.runTransaction(async (transaction: any) => {
            const productRef = firestoreDb.collection('products').doc(productId);
            const productSnap = await transaction.get(productRef);

            if (!productSnap.exists) {
                throw new Error('Product not found');
            }

            const product = productSnap.data() as Product;

            // Check authorization: must be seller or admin
            const isSeller = product.sellerId === userId;
            const isStaff = ['admin', 'superadmin'].includes(decodedToken.role);

            if (!isSeller && !isStaff) {
                throw new Error('Unauthorized');
            }

            const bids = product.bids || [];
            const bidIndex = bids.findIndex(b => b.id === bidId);

            if (bidIndex === -1) {
                throw new Error("Bid not found.");
            }

            const bidToReject = bids[bidIndex];

            // Call Stripe to cancel payment intent if necessary (placeholder for now as we don't have the secret key in this scope easily without importing)
            // Ideally, we would cancel the PaymentIntent here if it was authorized but not captured.
            // For Bidsy v1, marking as rejected is sufficient to prevent capture.

            bids[bidIndex] = { ...bidToReject, status: 'rejected' };

            transaction.update(productRef, { bids });

            return {
                bidderId: bidToReject.bidderId,
                productTitle: product.title,
                amount: bidToReject.amount
            };
        });

        // Notify Bidder
        await sendNotification(
            result.bidderId,
            'system',
            'Offer Declined',
            `Your offer of $${result.amount.toLocaleString()} for "${result.productTitle}" was declined.`,
            `/product/${productId}`
        );

        revalidatePath(`/product/${productId}`);
        return { success: true, message: 'Offer rejected.' };

    } catch (error: any) {
        console.error('Reject bid failed:', error);
        return { success: false, error: error.message || 'Failed to reject offer.' };
    }
}

export async function getSellerProductsWithOffers(idToken: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const sellerId = decodedToken.uid;

        // Query products by this seller that handle bids (reverse bidding or negotiable or untimed)
        // We can't easily query inside the 'bids' array for status='pending' without a collection group index or complex querying.
        // Instead, we'll fetch the seller's active products and filter in memory for those with pending bids.
        // Optimisation: We could add a 'hasPendingBids' flag to the product document in the future.

        const productsRef = firestoreDb.collection('products');
        const snapshot = await productsRef
            .where('sellerId', '==', sellerId)
            .where('status', 'in', ['available', 'active'])
            // We might need to check 'available' or whatever the active status is. 
            // Based on types.ts, status is 'available' | 'sold' ...
            .get();

        const productsWithOffers: Product[] = [];

        snapshot.docs.forEach((doc: firebaseAdmin.firestore.QueryDocumentSnapshot) => {
            const product = { id: doc.id, ...doc.data() } as Product;
            const hasPendingBids = product.bids?.some(bid => bid.status === 'pending');

            if (hasPendingBids) {
                productsWithOffers.push(product);
            }
        });

        return productsWithOffers;

    } catch (error) {
        console.error('Error fetching products with offers:', error);
        return [];
    }
}

export async function resetOffersAction(productId: string, idToken: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const { uid: userId } = decodedToken;

        const result = await firestoreDb.runTransaction(async (transaction: any) => {
            const productRef = firestoreDb.collection('products').doc(productId);
            const productSnap = await transaction.get(productRef);

            if (!productSnap.exists) {
                throw new Error('Product not found');
            }

            const product = productSnap.data() as Product;

            if (product.sellerId !== userId) {
                throw new Error('Unauthorized');
            }

            const activeBids = product.bids || [];
            if (activeBids.length === 0) {
                return { success: true, message: 'No offers to reset.' };
            }

            // Archive all bids that are not already accepted/sold (which shouldn't happen here anyway as we filter for available products usually)
            // But strict logic: pending/rejected -> archived.
            const updatedBids = activeBids.map(bid => {
                if (['pending', 'rejected'].includes(bid.status)) {
                    return { ...bid, status: 'archived' as const };
                }
                return bid;
            });

            transaction.update(productRef, { bids: updatedBids });

            return {
                success: true,
                bidsToNotify: activeBids.filter(b => b.status === 'pending')
            };
        });

        if (result.success && result.bidsToNotify) {
            // Notify pending bidders
            await Promise.all(result.bidsToNotify.map((bid: Bid) =>
                sendNotification(
                    bid.bidderId,
                    'system',
                    'Offer Cancelled',
                    `The seller has reset offers for "${productId}". Your offer has been removed.`,
                    `/product/${productId}`
                )
            ));
        }

        revalidatePath(`/product/${productId}`);
        return { success: true, message: 'All offers have been reset.' };

    } catch (error: any) {
        console.error('Reset offers failed:', error);
        return { success: false, error: error.message || 'Failed to reset offers.' };
    }
}
