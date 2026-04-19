'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { sendEmail } from '@/services/email';
import { sendNotification } from '@/services/notifications';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { serializeFirestoreData } from '@/lib/utils';
import { Product, UserProfile } from '@/lib/types';

// Using unified email service instead of Resend directly

export async function getOrdersNeedingNudge(idToken: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        if (!['admin', 'superadmin'].includes(decodedToken.role)) {
            throw new Error('Unauthorized');
        }

        // Find orders shipped but not delivered
        const snapshot = await firestoreDb.collection('orders')
            .where('status', '==', 'shipped')
            .get();

        const now = new Date();
        const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));

        const needingNudge = snapshot.docs
            .map((doc: any) => ({ id: doc.id, ...doc.data() } as any))
            .filter((order: any) => {
                const updatedAt = order.updatedAt?.toDate ? order.updatedAt.toDate() : new Date(order.updatedAt);
                // Older than 3 days AND nudgeCount < 3
                return updatedAt < threeDaysAgo && (order.nudgeCount || 0) < 3;
            });

        return {
            success: true,
            orders: needingNudge.map((order: any) => serializeFirestoreData({
                ...order,
                createdAt: order.createdAt?.toDate?.().toISOString() || order.createdAt,
                updatedAt: order.updatedAt?.toDate?.().toISOString() || order.updatedAt,
            }))
        };
    } catch (error: any) {
        console.error('Error fetching nudge orders:', error);
        return { success: false, error: error.message };
    }
}

export async function sendReceiptNudge(idToken: string, orderId: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        if (!['admin', 'superadmin'].includes(decodedToken.role)) {
            throw new Error('Unauthorized');
        }

        const orderRef = firestoreDb.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) throw new Error('Order not found');
        const order = orderSnap.data() as any;

        const buyerEmail = order.buyerEmail;
        const buyerId = order.buyerId;
        const orderRefCode = order.payIdReference || order.groupOrderId?.substring(0, 8);

        // 1. Send Email via SendGrid Service
        await sendEmail({
            from: 'Benched <support@benched.au>',
            to: buyerEmail,
            subject: `Quick check: Have you received your order ${orderRefCode}?`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #f26c0d;">Hey ${order.buyerName || 'there'}!</h2>
                    <p>Our records show that your order <strong>${orderRefCode}</strong> was shipped a few days ago.</p>
                    <p>Have you received it yet? If so, please log in to your dashboard and click <strong>"Confirm Receipt"</strong>. This helps ensure the seller gets paid for their item!</p>
                    <div style="margin: 30px 0;">
                        <a href="https://benched.au/profile/orders" style="background-color: #f26c0d; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to My Orders</a>
                    </div>
                    <p style="color: #666; font-size: 12px;">If there is an issue with your order, you can also lodge a dispute from the same page.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 10px; color: #999;">Benched Marketplace Australia</p>
                </div>
            `
        });

        // 2. Send In-App Notification
        await sendNotification(
            buyerId,
            'system',
            'Order Delivery Check',
            `Have you received order ${orderRefCode}? Please confirm receipt in your dashboard.`,
            '/profile/orders'
        );

        // 3. Update Order Nudge Stats
        await orderRef.update({
            nudgeCount: FieldValue.increment(1),
            lastNudgeAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp() // Reset the 3-day clock
        });

        return { success: true, message: 'Nudge sent successfully.' };
    } catch (error: any) {
        console.error('Error sending nudge:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Triggers a review nudge for a buyer who recently purchased an item.
 */
export async function triggerReviewNudge(productId: string, buyerUid: string) {
    if (!productId || !buyerUid) return;

    try {
        const productRef = firestoreDb.collection('products').doc(productId);
        const productSnap = await productRef.get();
        if (!productSnap.exists) return;
        const product = productSnap.data() as Product;

        const buyerRef = firestoreDb.collection('users').doc(buyerUid);
        const buyerSnap = await buyerRef.get();
        if (!buyerSnap.exists) return;
        const buyer = buyerSnap.data() as UserProfile;

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://benched.au';
        const reviewLink = `${siteUrl}/product/${productId}#review-form`;

        // 1. Send In-App Notification
        await sendNotification(
            buyerUid,
            'system',
            'Leave a Review ⭐️',
            `How was your experience buying the ${product.title}? Leave a review for the seller!`,
            `/product/${productId}`
        );

        // 2. Send External Email if they have an email
        if (buyer.email) {
            const { sendReviewNudgeEmail } = await import('@/lib/email');
            await sendReviewNudgeEmail({
                to: buyer.email,
                buyerName: buyer.displayName || 'Buyer',
                productTitle: product.title,
                reviewLink
            });
        }

        console.log(`Review nudge triggered for buyer ${buyerUid} on product ${productId}`);
    } catch (error) {
        console.error('Error triggering review nudge:', error);
    }
}

/**
 * Scans for 'pending' products (enquiryStatus) that are older than 3 days
 * and nudges the seller to update the status.
 */
export async function nudgePendingSellers() {
    try {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const snapshot = await firestoreDb.collection('products')
            .where('enquiryStatus', '==', 'pending')
            .where('updatedAt', '<=', Timestamp.fromDate(threeDaysAgo))
            .limit(50)
            .get();

        console.log(`Found ${snapshot.size} pending listings to nudge.`);

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://benched.au';
        const dashboardLink = `${siteUrl}/sell/dashboard`;

        for (const doc of snapshot.docs) {
            const product = doc.data() as Product;
            
            // Only nudge if not nudged recently (1 week)
            const lastNudgeAt = (product as any).lastGhostNudgeAt?.toDate();
            if (lastNudgeAt) {
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                if (lastNudgeAt > oneWeekAgo) continue;
            }

            if (product.sellerEmail) {
                const { sendSellerGhostNudgeEmail } = await import('@/lib/email');
                await sendSellerGhostNudgeEmail({
                    to: product.sellerEmail,
                    sellerName: product.sellerName || 'Seller',
                    productTitle: product.title,
                    dashboardLink
                });

                // Update last nudge timestamp to avoid spam
                await doc.ref.update({
                    lastGhostNudgeAt: FieldValue.serverTimestamp()
                });
            }
        }

        return { success: true, count: snapshot.size };
    } catch (error: any) {
        console.error('Error nudging pending sellers:', error);
        return { success: false, error: error.message };
    }
}

