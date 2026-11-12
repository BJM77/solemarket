import 'server-only';
/**
 * Sends seller push notifications with firebase-admin messaging (free FCM web push).
 * Tokens live in users/{uid}/fcmTokens/{sha256(token)}, written only by the Admin SDK
 * (Firestore rules deny clients: no match -> default deny).
 */
import { createHash } from 'crypto';
import { firestoreDb, messagingAdmin } from '@/lib/firebase/admin';
import { buildBuyerRequestPush, buildOrderPush, buildWebPushMessage, isDeadTokenError, type BuyerRequestPushKind, type OrderPushInput, type OrderPushKind, type PushPayload } from './push-payload';

export const MAX_TOKENS_PER_USER = 10;

export function fcmTokenDocId(token: string): string {
    return createHash('sha256').update(`fcm:${token}`).digest('hex');
}

export const tokensCol = (uid: string) => firestoreDb.collection('users').doc(uid).collection('fcmTokens');

export interface PushDeps {
    db?: any;
    messaging?: any;
}

/** Sends to every saved device for the user and deletes tokens FCM says are dead. */
export async function sendPushToUser(uid: string, payload: PushPayload, deps: PushDeps = {}) {
    const db = deps.db || firestoreDb;
    const messaging = deps.messaging || messagingAdmin;
    if (!uid || typeof messaging?.sendEachForMulticast !== 'function') return { sent: 0, removed: 0, reason: 'unavailable' as const };
    const snap = await db.collection('users').doc(uid).collection('fcmTokens').get();
    const docs = (snap.docs || []).filter((d: any) => typeof d.data()?.token === 'string');
    if (!docs.length) return { sent: 0, removed: 0, reason: 'no-tokens' as const };
    const tokens: string[] = docs.map((d: any) => d.data().token);
    const res = await messaging.sendEachForMulticast(buildWebPushMessage(payload, tokens));
    const dead: any[] = [];
    (res?.responses || []).forEach((r: any, i: number) => {
        if (!r?.success && isDeadTokenError(r?.error)) dead.push(docs[i].ref);
    });
    if (dead.length) {
        const batch = db.batch();
        dead.forEach((ref) => batch.delete(ref));
        await batch.commit();
    }
    return { sent: Number(res?.successCount || 0), removed: dead.length };
}

/** Best effort: never throws (an order must not fail because a push did). */
export async function pushOrderToSeller(kind: OrderPushKind, order: OrderPushInput & { sellerId?: string }, deps: PushDeps = {}) {
    try {
        if (!order?.sellerId) return null;
        return await sendPushToUser(String(order.sellerId), buildOrderPush(kind, order), deps);
    } catch (e) {
        console.error('seller push failed', kind, e);
        return null;
    }
}

/** Best effort push to a signed-in buyer (only reaches them if they turned notifications on). */
export async function pushRequestToBuyer(kind: BuyerRequestPushKind, order: OrderPushInput & { buyerId?: string | null }, deps: PushDeps = {}) {
    try {
        if (!order?.buyerId) return null;
        return await sendPushToUser(String(order.buyerId), buildBuyerRequestPush(kind, order), deps);
    } catch (e) {
        console.error('buyer push failed', kind, e);
        return null;
    }
}
