
'use server';

import { db } from '@/lib/firebase/config';
import { collection, addDoc, query, where, orderBy, limit, getDocs, updateDoc, doc, Timestamp, writeBatch } from 'firebase/firestore';
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
        createdAt: Timestamp.now()
    };

    await addDoc(collection(db, NOTIFICATIONS_COL), notification);
}

/**
 * Get the latest notifications for the current user.
 */
export async function getUserNotifications(userId: string, limitCount = 20) {
    const q = query(
        collection(db, NOTIFICATIONS_COL),
        where('recipientId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
}

/**
 * Mark a specific notification as read.
 */
export async function markAsRead(notificationId: string) {
    const ref = doc(db, NOTIFICATIONS_COL, notificationId);
    await updateDoc(ref, { read: true });
}

/**
 * Mark all notifications for a user as read.
 */
export async function markAllAsRead(userId: string) {
    const q = query(
        collection(db, NOTIFICATIONS_COL),
        where('recipientId', '==', userId),
        where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { read: true });
    });

    await batch.commit();
}

export async function getSuperAdminId(): Promise<string | null> {
    try {
        // If we have hardcoded UIDs, use the first one as the primary admin ID
        if (SUPER_ADMIN_UIDS.length > 0) {
            return SUPER_ADMIN_UIDS[0];
        }

        const q = query(collection(db, 'users'), where('email', 'in', SUPER_ADMIN_EMAILS), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            return querySnapshot.docs[0].id;
        }
        return null;
    } catch (error) {
        console.error('Error getting super admin ID:', error);
        return null;
    }
}
