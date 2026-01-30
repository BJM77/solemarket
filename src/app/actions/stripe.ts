
'use server'

import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function connectStripeAction(idToken: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const { uid: userId } = decodedToken;

        // In a real app, we would use stripe.accounts.create() and return an account link.
        // For now, we'll simulate the successful connection.

        const userRef = firestoreDb.collection('users').doc(userId);
        const stripeAccountId = `acct_${Math.random().toString(36).substr(2, 14)}`;

        await userRef.update({
            stripeAccountId,
            stripeEnabled: true,
            updatedAt: FieldValue.serverTimestamp(),
        });

        return { success: true, stripeAccountId, message: "Stripe Connect authorized successfully." };
    } catch (error: any) {
        console.error("Stripe connection failed:", error);
        return { success: false, message: error.message };
    }
}
