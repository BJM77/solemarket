
'use server'

import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function upgradePlanAction(idToken: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const { uid: userId } = decodedToken;

        // In a real app, we would initiate a Stripe Checkout session here.
        // For now, we'll simulate the successful upgrade by updating the user profile.

        const userRef = firestoreDb.collection('users').doc(userId);

        await userRef.update({
            listingLimit: 1000, // Pro limit
            plan: 'pro',
            updatedAt: FieldValue.serverTimestamp(),
        });

        return { success: true, message: "Subscription activated! Your listing limit is now 1,000 items." };
    } catch (error: any) {
        console.error("Upgrade plan failed:", error);
        return { success: false, message: error.message };
    }
}
