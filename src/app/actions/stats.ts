'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';

export async function getPlatformStats(idToken: string): Promise<{
  totalItems?: number;
  totalRevenue?: number;
  activeSellers?: number;
  suspendedSellers?: number;
  pendingApprovals?: number;
  error?: string;
}> {
  try {
    // Verify the user is an admin
    const decodedToken = await verifyIdToken(idToken);

    // Fetch the user's role directly from Firestore to ensure accuracy
    // This avoids reliance on custom claims which might not be set immediately
    const userDoc = await firestoreDb.collection('users').doc(decodedToken.uid).get();

    // Import SUPER_ADMIN_UIDS from constants
    const { SUPER_ADMIN_UIDS } = await import('@/lib/constants');
    let isAdmin = SUPER_ADMIN_UIDS.includes(decodedToken.uid);

    if (userDoc.exists && !isAdmin) {
      const userData = userDoc.data();
      isAdmin = userData?.isAdmin === true || userData?.role === 'admin' || userData?.role === 'superadmin';
    }

    if (!isAdmin) {
      if (!userDoc.exists) {
        return { error: 'User profile not found.' };
      }
      return { error: 'You do not have permission to view platform statistics.' };
    }

    const globalRef = firestoreDb.collection('platform_stats').doc('global');
    const globalSnap = await globalRef.get();
    const globalData = globalSnap.data();

    // Fetch dynamic counts
    const activeSellersSnap = await firestoreDb.collection('users')
      .where('role', '==', 'seller')
      .where('onStop', '==', false)
      .count().get();

    const suspendedSellersSnap = await firestoreDb.collection('users')
      .where('onStop', '==', true)
      .count().get();

    const pendingApprovalsSnap = await firestoreDb.collection('users')
      .where('sellerStatus', '==', 'pending')
      .count().get();

    return {
      totalItems: globalData?.totalItems || 0,
      totalRevenue: globalData?.totalRevenue || 0,
      activeSellers: activeSellersSnap.data().count,
      suspendedSellers: suspendedSellersSnap.data().count,
      pendingApprovals: pendingApprovalsSnap.data().count
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

export async function fetchProductCount(): Promise<number> {
  try {
    const snapshot = await firestoreDb
      .collection('products')
      .where('status', '==', 'available')
      .count()
      .get();
    return snapshot.data().count;
  } catch (error) {
    console.error('Error fetching product count:', error);
    // Return 0 instead of throwing, to prevent 500 error on frontend
    return 0;
  }
}
