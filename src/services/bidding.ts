
import { db } from '@/lib/firebase/config';
import { doc, updateDoc, arrayUnion, getDoc, serverTimestamp, Timestamp, runTransaction } from 'firebase/firestore';
import { Product, Bid } from '@/lib/types';

export async function placeBid(productId: string, bidderId: string, bidderName: string, amount: number) {
    return await runTransaction(db, async (transaction) => {
        const productRef = doc(db, 'products', productId);
        const productSnap = await transaction.get(productRef);

        if (!productSnap.exists()) {
            throw new Error('Product not found');
        }

        const product = productSnap.data() as Product;

        if (!product.isReverseBidding) {
            throw new Error('This product does not accept bids');
        }

        if (bidderId === product.sellerId) {
            throw new Error("You cannot bid on your own item.");
        }

        const currentBids = product.bids || [];
        const highestBidAmount = currentBids.reduce((max, bid) => Math.max(max, bid.amount), 0);
        const baselinePrice = Math.max(product.price, highestBidAmount);

        // Relaxed restrictions for "Offers"
        // Sellers can decide to accept low offers or high offers.

        const newBid: Bid = {
            id: crypto.randomUUID(),
            bidderId,
            bidderName,
            amount,
            timestamp: Timestamp.now(),
            status: 'pending'
        };

        transaction.update(productRef, {
            bids: arrayUnion(newBid)
        });

        return newBid;
    });
}

export async function acceptBid(productId: string, bidId: string) {
    return await runTransaction(db, async (transaction) => {
        const productRef = doc(db, 'products', productId);
        const productSnap = await transaction.get(productRef);

        if (!productSnap.exists()) {
            throw new Error('Product not found');
        }

        const product = productSnap.data() as Product;
        const bids = product.bids || [];
        const acceptedBid = bids.find(b => b.id === bidId);

        if (!acceptedBid) {
            throw new Error("Bid not found.");
        }

        // Update the status of all bids
        const updatedBids = bids.map(bid => {
            if (bid.id === bidId) {
                return { ...bid, status: 'accepted' as const };
            }
            // Optionally mark other pending bids as rejected
            if (bid.status === 'pending') {
                return { ...bid, status: 'rejected' as const };
            }
            return bid;
        });

        transaction.update(productRef, {
            bids: updatedBids,
            acceptedBidId: bidId,
            price: acceptedBid.amount, // Update the product price to the accepted bid amount
            status: 'sold', // Mark the product as sold
            soldAt: serverTimestamp()
        });
    });
}
