'use server'

import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { FieldValue } from 'firebase-admin/firestore';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export async function connectStripeAction(idToken: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const { uid: userId, email } = decodedToken;

        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error("Stripe is not configured (missing secret key).");
        }

        const userRef = firestoreDb.collection('users').doc(userId);
        const userSnap = await userRef.get();
        const userData = userSnap.data();

        let stripeAccountId = userData?.stripeAccountId;

        // 1. Create Stripe Account if it doesn't exist
        if (!stripeAccountId) {
            const account = await stripe.accounts.create({
                type: 'express',
                country: 'AU', // Defaulting to AU for Pick1901 context
                email: email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                business_type: 'individual', // Can be dynamic if needed
            });
            stripeAccountId = account.id;

            await userRef.update({
                stripeAccountId,
                updatedAt: FieldValue.serverTimestamp(),
            });
        }

        // 2. Create Account Link for onboarding
        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/seller/dashboard`, // On failure/cancel
            return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/seller/onboarding/return`, // On success
            type: 'account_onboarding',
        });

        return {
            success: true,
            url: accountLink.url,
            message: "Redirecting to Stripe..."
        };

    } catch (error: any) {
        console.error("Stripe connection failed:", error);
        return { success: false, message: error.message };
    }
}

export async function verifyStripeAccountAction(idToken: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const { uid: userId } = decodedToken;

        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error("Stripe configuration missing.");
        }

        const userRef = firestoreDb.collection('users').doc(userId);
        const userSnap = await userRef.get();
        const userData = userSnap.data();

        if (!userData?.stripeAccountId) {
            return {
                success: false,
                message: "No Stripe account found for this user."
            };
        }

        const account = await stripe.accounts.retrieve(userData.stripeAccountId);

        // Check if details are submitted (Express accounts handles requirements)
        const isEnabled = account.details_submitted; // && account.charges_enabled && account.payouts_enabled;

        await userRef.update({
            stripeEnabled: isEnabled,
            stripeDetailsSubmitted: account.details_submitted,
            updatedAt: FieldValue.serverTimestamp(),
        });

        return {
            success: true,
            isEnabled,
            detailsSubmitted: account.details_submitted,
            message: isEnabled ? "Stripe account verified and active." : "Stripe account details pending."
        };

    } catch (error: any) {
        console.error("Verification failed:", error);
        return { success: false, message: error.message };
    }
}
