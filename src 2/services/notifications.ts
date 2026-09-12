'use server';

import { firestoreDb, admin as firebaseAdmin } from '@/lib/firebase/admin';
import { Notification } from '@/lib/types';
import { SUPER_ADMIN_EMAILS, SUPER_ADMIN_UIDS } from '@/lib/constants';

const NOTIFICATIONS_COL = 'notifications';

/**
 * Trigger a notification for a user.
 * Use this when: a bid is placed (notify seller), a user is outbid, a reply is posted, etc.
 */
export async function sendNotification(
    recipientId: string,
    type: 'outbid' | 'sale' | 'system' | 'mention' | 'wishlist_alert',
    title: string,
    message: string,
    link?: string
) {
    const notification: Omit<Notification, 'id'> = {
        recipientId,
        type,
        title,
        message,
        link,
        read: false,
        createdAt: firebaseAdmin.firestore.Timestamp.now() as any
    };

    await firestoreDb.collection(NOTIFICATIONS_COL).add(notification);
}

/**
 * Get the latest notifications for the current user.
 * Note: Returning this to the client might require converting Timestamps to Dates/Strings.
 */
export async function getUserNotifications(userId: string, limitCount = 20) {
    const snapshot = await firestoreDb.collection(NOTIFICATIONS_COL)
        .where('recipientId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limitCount)
        .get();

    return snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            // Convert Admin Timestamp to a format more likely to be serialized or handled by the client
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
        } as any;
    });
}

/**
 * Mark a specific notification as read.
 */
export async function markAsRead(notificationId: string) {
    const ref = firestoreDb.collection(NOTIFICATIONS_COL).doc(notificationId);
    await ref.update({ read: true });
}

/**
 * Mark all notifications for a user as read.
 */
export async function markAllAsRead(userId: string) {
    const snapshot = await firestoreDb.collection(NOTIFICATIONS_COL)
        .where('recipientId', '==', userId)
        .where('read', '==', false)
        .get();

    const batchSize = 500;
    const docs = snapshot.docs;

    for (let i = 0; i < docs.length; i += batchSize) {
        const batch = firestoreDb.batch();
        const chunk = docs.slice(i, i + batchSize);
        chunk.forEach((doc: any) => {
            batch.update(doc.ref, { read: true });
        });
        await batch.commit();
    }
}

export async function getSuperAdminId(): Promise<string | null> {
    try {
        // If we have hardcoded UIDs, use the first one as the primary admin ID
        if (SUPER_ADMIN_UIDS.length > 0) {
            return SUPER_ADMIN_UIDS[0];
        }

        if (SUPER_ADMIN_EMAILS.length === 0) {
            return null;
        }

        const snapshot = await firestoreDb.collection('users')
            .where('email', 'in', SUPER_ADMIN_EMAILS)
            .limit(1)
            .get();

        if (!snapshot.empty) {
            return snapshot.docs[0].id;
        }
        return null;
    } catch (error) {
        console.error('Error getting super admin ID:', error);
        return null;
    }
}
