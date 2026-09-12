import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firestore';

// Note: In a real app, this vapidKey should be in an env var.
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || 'YOUR_VAPID_KEY_HERE';

export async function requestNotificationPermission(userId: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const messaging = getMessaging(app);
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      
      if (token && userId) {
        // Save token to Firestore so we can send pushes to this user
        await setDoc(doc(db, `users/${userId}/fcmTokens`, token), {
          token,
          createdAt: new Date(),
          platform: 'web'
        });
        console.log('FCM Token generated and saved.');
      }
    }
  } catch (err) {
    console.error('Failed to request notification permission:', err);
  }
}

export function onMessageListener() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined') {
      const messaging = getMessaging(app);
      onMessage(messaging, (payload) => {
        resolve(payload);
      });
    }
  });
}
