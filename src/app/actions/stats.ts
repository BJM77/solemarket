'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';

export async function getPlatformStats(idToken: string): Promise<{ totalItems?: number; totalRevenue?: number; error?: string }> {
  try {
    // Verify the user is an admin
    const decodedToken = await verifyIdToken(idToken);
    
    // Fetch the user's role directly from Firestore to ensure accuracy
    // This avoids reliance on custom claims which might not be set immediately
    const userDoc = await firestoreDb.collection('users').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
        return { error: 'User profile not found.' };
    }

    const userData = userDoc.data();
    const isAdmin = userData?.isAdmin === true || userData?.role === 'admin' || userData?.role === 'superadmin';

    if (!isAdmin) {
      return { error: 'You do not have permission to view platform statistics.' };
    }

    const docRef = firestoreDb.collection('platform_stats').doc('global');
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
        // Return zeros if the doc hasn't been created yet
        return { totalItems: 0, totalRevenue: 0 };
    }

    const data = docSnap.data();
    return {
        totalItems: data?.totalItems || 0,
        totalRevenue: data?.totalRevenue || 0
    };
  } catch (error: any) {
    console.error("[Stats Action] Failed to fetch platform stats:", {
        message: error.message,
        code: error.code,
        stack: error.stack
    });
    // Return an error payload
    return { 
        error: `Server Error: ${error.message}`
    };
  }
}
