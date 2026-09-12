export async function reportError(error: Error | string, context: Record<string, any> = {}) {
  const errorMessage = error instanceof Error ? error.message : error;
  console.error(`[REPORTED ERROR] ${errorMessage}`, context);

  // Client-side reporting delegating to API route
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: errorMessage, context, clientTime: new Date().toISOString() }),
      });
    } catch (e) {
      console.warn('Failed to send error to log API:', e);
    }
    return;
  }

  // Server-side reporting using Firebase Admin
  try {
    const { isFirebaseAdminReady, firestoreDb } = await import('@/lib/firebase/admin');
    if (isFirebaseAdminReady && firestoreDb) {
      const admin = await import('firebase-admin');
      await firestoreDb.collection('system_errors').add({
        message: errorMessage,
        context,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        environment: process.env.NODE_ENV,
      });
    }
  } catch (e) {
    console.error('Failed to log server error to Firestore:', e);
  }
}
