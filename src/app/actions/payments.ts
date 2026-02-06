'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

// 1. Create a SetupIntent for saving a card (binding offer)
export async function createSetupIntentAction(idToken: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const { uid: userId, email } = decodedToken;

        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error("Stripe configuration missing.");
        }

        // Get or Create Stripe Customer
        const userRef = firestoreDb.collection('users').doc(userId);
        const userSnap = await userRef.get();
        const userData = userSnap.data();

        let customerId = userData?.stripeCustomerId;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: email,
                metadata: {
                    userId: userId,
                },
            });
            customerId = customer.id;
            await userRef.update({ stripeCustomerId: customerId });
        }

        const setupIntent = await stripe.setupIntents.create({
            customer: customerId,
            payment_method_types: ['card'],
        });

        return { success: true, clientSecret: setupIntent.client_secret };

    } catch (error: any) {
        console.error("SetupIntent creation failed:", error);
        return { success: false, message: error.message };
    }
}
