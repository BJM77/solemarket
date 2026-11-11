'use client';
/**
 * Seller order notifications on this device (free Firebase Cloud Messaging web push).
 * The service worker is public/firebase-messaging-sw.js, registered on its own scope so it
 * never clashes with the PWA worker (/sw.js).
 */
import { app } from './config';
import { getCurrentUserIdToken } from './auth';
import { detectPushSupport, deviceLabel, type PushSupport } from '@/lib/notifications/push-env';
import { registerPushTokenAction, unregisterPushTokenAction } from '@/app/actions/seller/push-notifications';

/**
 * Public Web Push (VAPID) key from Firebase console > Project settings > Cloud Messaging >
 * Web Push certificates. Not a secret. When unset, the Firebase SDK uses its built-in default
 * key, which still works with this project's FCM.
 */
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || undefined;
const SW_URL = '/firebase-messaging-sw.js';
const SW_SCOPE = '/firebase-cloud-messaging-push-scope';
const LOCAL_KEY = 'benched:push-token';

export function getPushSupport(): PushSupport {
    if (typeof window === 'undefined') return 'unsupported';
    const nav: any = navigator;
    return detectPushSupport({
        userAgent: navigator.userAgent || '',
        maxTouchPoints: navigator.maxTouchPoints || 0,
        standalone: window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true,
        hasNotification: 'Notification' in window,
        hasServiceWorker: 'serviceWorker' in navigator,
        hasPushManager: 'PushManager' in window,
    });
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';
}

async function fcmToken(): Promise<string> {
    const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
    if (!(await isSupported())) throw new Error("This browser doesn't support notifications.");
    const registration = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE, updateViaCache: 'none' });
    const token = await getToken(getMessaging(app), { ...(VAPID_KEY ? { vapidKey: VAPID_KEY } : {}), serviceWorkerRegistration: registration });
    if (!token) throw new Error("Couldn't set up notifications on this device.");
    return token;
}

async function saveToken(token: string) {
    const idToken = await getCurrentUserIdToken();
    if (!idToken) throw new Error('Please sign in again.');
    const r = await registerPushTokenAction(idToken, token, { device: deviceLabel(navigator.userAgent, navigator.maxTouchPoints) });
    if (!r.success) throw new Error(r.error);
    try { localStorage.setItem(LOCAL_KEY, token); } catch { /* private mode */ }
}

/** Asks permission (must run from a click), gets this device's FCM token and saves it. */
export async function enableOrderNotifications(): Promise<void> {
    if (getPushSupport() !== 'supported') throw new Error("This browser doesn't support notifications.");
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        throw new Error(permission === 'denied'
            ? 'Notifications are blocked for benched.au. Allow them in your browser or phone settings, then try again.'
            : 'Notifications were not allowed.');
    }
    await saveToken(await fcmToken());
}

/** Silent refresh on visits (FCM tokens rotate). Only when permission was already granted. */
export async function refreshOrderNotificationToken(): Promise<boolean> {
    if (getPushSupport() !== 'supported' || Notification.permission !== 'granted') return false;
    const token = await fcmToken();
    let known: string | null = null;
    try { known = localStorage.getItem(LOCAL_KEY); } catch { /* ignore */ }
    if (known !== token) await saveToken(token);
    return true;
}

export async function disableOrderNotifications(): Promise<void> {
    let token: string | null = null;
    try { token = localStorage.getItem(LOCAL_KEY); } catch { /* ignore */ }
    try {
        const { getMessaging, deleteToken, isSupported } = await import('firebase/messaging');
        if (await isSupported()) {
            if (!token) token = await fcmToken().catch(() => null);
            await deleteToken(getMessaging(app)).catch(() => {});
        }
    } finally {
        const idToken = await getCurrentUserIdToken();
        if (idToken && token) await unregisterPushTokenAction(idToken, token);
        try { localStorage.removeItem(LOCAL_KEY); } catch { /* ignore */ }
    }
}

export function hasLocalPushToken(): boolean {
    try { return !!localStorage.getItem(LOCAL_KEY); } catch { return false; }
}
