'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { Resend } from 'resend';
import { sendNotification } from '@/services/notifications';
import { FieldValue } from 'firebase-admin/firestore';
import { serializeFirestoreData } from '@/lib/utils';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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
            .map(doc => ({ id: doc.id, ...doc.data() } as any))
            .filter(order => {
                const updatedAt = order.updatedAt?.toDate ? order.updatedAt.toDate() : new Date(order.updatedAt);
                // Older than 3 days AND nudgeCount < 3
                return updatedAt < threeDaysAgo && (order.nudgeCount || 0) < 3;
            });

        return {
            success: true,
            orders: needingNudge.map(order => serializeFirestoreData({
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

        // 1. Send Email via Resend
        if (resend && buyerEmail) {
            await resend.emails.send({
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
        }

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
