'use server';

import { firestoreDb, messagingAdmin } from '@/lib/firebase/admin';

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
    // Fetch all FCM tokens for the user
    const tokensSnapshot = await firestoreDb.collection('users').doc(userId).collection('fcmTokens').get();
    
    if (tokensSnapshot.empty) {
      console.log(`No FCM tokens found for user ${userId}`);
      return { success: false, reason: 'no-tokens' };
    }

    const tokens = tokensSnapshot.docs.map((doc: any) => doc.data().token);

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

    const response = await (messagingAdmin as any).sendEachForMulticast(message);
    
    // Cleanup invalid tokens
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp: any, idx: number) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });
      
      const batch = firestoreDb.batch();
      tokensSnapshot.docs.forEach((doc: any) => {
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
