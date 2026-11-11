'use server';

/**
 * Seller order notifications (free FCM web push). The browser gets an FCM token and hands it
 * here; it's stored with the Admin SDK under users/{uid}/fcmTokens (clients can't read it).
 */
import { FieldValue } from 'firebase-admin/firestore';
import { ensureActionAuth } from '@/lib/action-utils';
import { checkRateLimit } from '@/lib/rate-limit-guard';
import { isPlausibleFcmToken, SELLER_ORDERS_PATH } from '@/lib/notifications/push-payload';
import { MAX_TOKENS_PER_USER, fcmTokenDocId, sendPushToUser, tokensCol } from '@/lib/notifications/push-server';

type Result<T = object> = ({ success: true } & T) | { success: false; error: string };

const clean = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);

export async function registerPushTokenAction(idToken: string, token: string, meta?: { device?: string }): Promise<Result<{ devices: number }>> {
    try {
        const { uid } = await ensureActionAuth(idToken);
        if (!isPlausibleFcmToken(token)) return { success: false, error: "This browser didn't give us a valid notification token." };
        if (!(await checkRateLimit('push_token_register', { limit: 30, windowSeconds: 3600, identifier: uid }))) {
            return { success: false, error: 'Too many attempts. Please try again later.' };
        }
        const col = tokensCol(uid);
        await col.doc(fcmTokenDocId(token)).set({
            token,
            platform: 'web',
            device: clean(meta?.device, 80) || null,
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        // Keep the newest few devices only.
        const all = await col.get();
        const docs = [...all.docs].sort((a: any, b: any) => (b.data().updatedAt?.toMillis?.() || 0) - (a.data().updatedAt?.toMillis?.() || 0));
        const extra = docs.slice(MAX_TOKENS_PER_USER);
        await Promise.all(extra.map((d: any) => d.ref.delete()));
        return { success: true, devices: Math.min(docs.length, MAX_TOKENS_PER_USER) };
    } catch (e: any) {
        return { success: false, error: e?.message || 'Could not turn on notifications.' };
    }
}

export async function unregisterPushTokenAction(idToken: string, token: string): Promise<Result> {
    try {
        const { uid } = await ensureActionAuth(idToken);
        if (isPlausibleFcmToken(token)) await tokensCol(uid).doc(fcmTokenDocId(token)).delete();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e?.message || 'Could not turn off notifications.' };
    }
}

/** "Send a test" button: proves this device gets order notifications. */
export async function sendTestPushAction(idToken: string): Promise<Result<{ sent: number }>> {
    try {
        const { uid } = await ensureActionAuth(idToken);
        if (!(await checkRateLimit('push_test', { limit: 5, windowSeconds: 600, identifier: uid }))) {
            return { success: false, error: 'Too many test notifications. Try again in a few minutes.' };
        }
        const r = await sendPushToUser(uid, {
            title: 'Benched order notifications are on',
            body: "You'll get a notification like this when someone orders, cancels or a hold runs out.",
            url: SELLER_ORDERS_PATH,
            tag: 'benched-test',
        });
        if (!r.sent) return { success: false, error: r.reason === 'no-tokens' ? 'No devices are set up yet. Turn on notifications first.' : "The test didn't reach any device. Try turning notifications off and on again." };
        return { success: true, sent: r.sent };
    } catch (e: any) {
        return { success: false, error: e?.message || 'Could not send a test notification.' };
    }
}
