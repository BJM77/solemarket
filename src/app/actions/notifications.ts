'use server';

import { getFirebaseAdminApp } from '@/lib/firebase/admin';
import { getMessaging } from 'firebase-admin/messaging';

/**
 * Sends a push notification to a specific user using FCM
 */
export async function sendPushNotification(
  userId: string, 
  title: string, 
  body: string, 
  url: string = '/'
) {
  try {
    const admin = await getFirebaseAdminApp();
    const messaging = getMessaging(admin);
    const db = admin.firestore();

    // Fetch all FCM tokens for the user
    const tokensSnapshot = await db.collection('users').doc(userId).collection('fcmTokens').get();
    
    if (tokensSnapshot.empty) {
      console.log(`No FCM tokens found for user ${userId}`);
      return { success: false, reason: 'no-tokens' };
    }

    const tokens = tokensSnapshot.docs.map(doc => doc.data().token);

    const message = {
      notification: {
        title,
        body,
      },
      data: {
        url,
      },
      tokens,
    };

    const response = await messaging.sendEachForMulticast(message);
    
    // Cleanup invalid tokens
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });
      
      const batch = db.batch();
      tokensSnapshot.docs.forEach((doc) => {
        if (failedTokens.includes(doc.data().token)) {
          batch.delete(doc.ref);
        }
      });
      await batch.commit();
    }

    return { success: true, count: response.successCount };
  } catch (err) {
    console.error('Error sending push notification:', err);
    return { success: false, error: 'Internal Server Error' };
  }
}
