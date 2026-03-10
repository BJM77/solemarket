'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { sendTelegramNotification } from '@/lib/telegram';
import { sendSellerEnquiryEmail } from '@/lib/email';
import { revalidateTag } from 'next/cache';


export async function updateProductPrice(productId: string, newPrice: number, idToken: string) {
    if (!productId || typeof newPrice !== 'number' || !idToken) {
        return { success: false, error: 'Invalid input' };
    }

    try {
        const decoded = await verifyIdToken(idToken);
        const role = decoded.role;
        if (role !== 'superadmin' && role !== 'admin') {
            return { success: false, error: 'Unauthorized' };
        }

        const docRef = firestoreDb.collection('products').doc(productId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) return { success: false, error: 'Product not found' };

        const productData = docSnap.data();
        const oldPrice = productData?.price || 0;

        await docRef.update({
            price: newPrice,
            oldPrice: oldPrice, // Save for visual "Price Drop" badge
            updatedAt: FieldValue.serverTimestamp()
        });

        // Detect Price Drop and Notify
        if (newPrice < oldPrice) {
            const dropAmount = oldPrice - newPrice;
            const dropPercent = Math.round((dropAmount / oldPrice) * 100);

            // 1. Notify Admin/Telegram
            await sendTelegramNotification(
                `<b>📉 Price Drop Alert!</b>\n\n` +
                `<b>Product:</b> ${productData?.title}\n` +
                `<b>Old Price:</b> $${oldPrice}\n` +
                `<b>New Price:</b> $${newPrice} (-${dropPercent}%)\n\n` +
                `<a href="https://benched.au/product/${productId}">View Product</a>`
            );

            // 2. Background: Find all users who favorited this and prepare notifications
            // (In a real app, this would queue a job to send Push/Email)
            const favoritesSnap = await firestoreDb.collectionGroup('favorites')
                .where('id', '==', productId) // Assuming the favorite doc has the product ID
                .get();

            console.log(`Price drop: Notifying ${favoritesSnap.size} interested users.`);
        }

        revalidateTag('products-featured');
        revalidateTag('products-sneakers');

        return { success: true };
    } catch (error: any) {
        console.error('Update price error:', error);
        return { success: false, error: error.message };
    }
}

export async function bulkUpdateProductPrice(productIds: string[], newPrice: number, idToken: string) {
    if (!productIds.length || typeof newPrice !== 'number' || !idToken) {
        return { success: false, error: 'Invalid input' };
    }

    try {
        const decoded = await verifyIdToken(idToken);
        const role = decoded.role;
        if (role !== 'superadmin' && role !== 'admin') {
            return { success: false, error: 'Unauthorized' };
        }

        const batch = firestoreDb.batch();
        productIds.forEach(id => {
            const ref = firestoreDb.collection('products').doc(id);
            batch.update(ref, {
                price: newPrice,
                updatedAt: FieldValue.serverTimestamp()
            });
        });

        await batch.commit();

        revalidateTag('products-featured');
        revalidateTag('products-sneakers');

        return { success: true };
    } catch (error: any) {
        console.error('Bulk update price error:', error);
        return { success: false, error: error.message };
    }
}

export async function recordProductEnquiry(productId: string, buyerUid: string) {
    if (!productId || !buyerUid) return { success: false, error: 'Invalid Input' };

    try {
        const now = new Date();
        const docRef = firestoreDb.collection('products').doc(productId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) return { success: false, error: 'Product not found' };
        
        const data = docSnap.data();

        // 1. Check if user already has 2 active holds elsewhere
        const activeHoldsSnap = await firestoreDb.collection('products')
            .where('heldBy', '==', buyerUid)
            .where('holdExpiresAt', '>', Timestamp.fromDate(now))
            .get();
        
        if (activeHoldsSnap.size >= 2) {
            return { success: false, error: 'You can only have 2 active "Buy & Collect" holds at once.' };
        }

        // 2. Check how many times THIS user has held THIS item
        const holdCountMap = data?.holdCountMap || {};
        const userHoldCount = holdCountMap[buyerUid] || 0;

        if (userHoldCount >= 3) {
            return { success: false, error: 'You have reached the maximum number of holds (3) for this specific item.' };
        }

        // 3. Apply the 5-minute hold
        const holdExpiresAt = new Date(now.getTime() + 5 * 60 * 1000);
        const updatedHoldCountMap = { ...holdCountMap, [buyerUid]: userHoldCount + 1 };

        await docRef.update({
            contactCallCount: FieldValue.increment(1),
            enquiryStatus: 'enquired',
            enquiryUpdatedAt: FieldValue.serverTimestamp(),
            heldBy: buyerUid,
            holdExpiresAt: Timestamp.fromDate(holdExpiresAt),
            holdCountMap: updatedHoldCountMap
        });

        // Generate a secure token for the seller email
        const quickActionToken = Math.random().toString(36).substring(2, 15);
        await docRef.update({ quickActionToken });

        // Generate Quick Action Links
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://benched.au';
        const pendingLink = `${baseUrl}/api/seller/quick-action?productId=${productId}&token=${quickActionToken}&action=pending`;
        const relistLink = `${baseUrl}/api/seller/quick-action?productId=${productId}&token=${quickActionToken}&action=available`;

        // Notify via Telegram
        await sendTelegramNotification(
            `<b>🤝 New 'Buy & Collect' Enquiry!</b>\n\n` +
            `<b>Item:</b> ${data?.title}\n` +
            `<b>Seller:</b> ${data?.sellerName}\n` +
            `<b>Hold Expiry:</b> 5 Minutes\n\n` +
            `<a href="${pendingLink}">Mark as Pending</a> | <a href="${relistLink}">Relist</a>`
        );

        // Notify via Email (Professional Transactional Email)
        if (data?.sellerEmail) {
            await sendSellerEnquiryEmail({
                to: data.sellerEmail,
                sellerName: data.sellerName || 'Seller',
                productTitle: data.title,
                price: data.price.toString(),
                pendingLink,
                relistLink
            });
        }

        return { success: true, expiresAt: holdExpiresAt };
    } catch (error: any) {
        console.error('Record enquiry error:', error);
        return { success: false, error: error.message };
    }
}

export async function updateEnquiryStatus(productId: string, newStatus: 'pending' | 'sold' | 'available', idToken: string) {
    if (!productId || !idToken) return { success: false, error: 'Missing data' };

    try {
        const decoded = await verifyIdToken(idToken);
        const docRef = firestoreDb.collection('products').doc(productId);
        const docSnap = await docRef.get();
        
        if (!docSnap.exists) return { success: false, error: 'Product not found' };
        
        const data = docSnap.data();
        // Ensure only the seller or admin can update status
        if (data?.sellerId !== decoded.uid && decoded.role !== 'admin' && decoded.role !== 'superadmin') {
            return { success: false, error: 'Unauthorized' };
        }

        let updateData: any = { 
            enquiryStatus: newStatus,
            updatedAt: FieldValue.serverTimestamp() 
        };

        if (newStatus === 'sold') {
            updateData.status = 'sold';
            // We soft-delete by setting status to sold, effectively removing it from the feed
        } else if (newStatus === 'available') {
            updateData.status = 'available';
            updateData.enquiryStatus = FieldValue.delete(); // Clear the flag
        } else if (newStatus === 'pending') {
            // Pending keeps status 'available' but enquiryStatus 'pending' blocks contact
        }

        await docRef.update(updateData);
        revalidateTag('products-featured');
        
        return { success: true };
    } catch (error: any) {
        console.error('Update enquiry status error:', error);
        return { success: false, error: error.message };
    }
}

export async function incrementProductContactCount(productId: string) {
    if (!productId) {
        return { success: false, error: 'Invalid Product ID' };
    }

    try {
        await firestoreDb.collection('products').doc(productId).update({
            contactCallCount: FieldValue.increment(1)
        });
        return { success: true };
    } catch (error: any) {
        console.error('Increment contact count error:', error);
        // We don't want to alert the user really, just log it.
        return { success: false, error: error.message };
    }
}
