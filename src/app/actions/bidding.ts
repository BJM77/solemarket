
'use server'

import { firestoreDb, admin as firebaseAdmin } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { Product, Bid } from '@/lib/types';
import { sendNotification } from '@/services/notifications';
import { revalidatePath } from 'next/cache';

export async function placeBidAction(productId: string, idToken: string, amount: number) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const { uid: bidderId, name: bidderName } = decodedToken;

        const result = await firestoreDb.runTransaction(async (transaction) => {
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
                status: 'pending'
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

        const result = await firestoreDb.runTransaction(async (transaction) => {
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
