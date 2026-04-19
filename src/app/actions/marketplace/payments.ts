'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { getStripe } from '@/lib/stripe/server';

// 1. Create a SetupIntent for saving a card (binding offer)
export async function createSetupIntentAction(idToken: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const { uid: userId, email } = decodedToken;

        const stripe = getStripe();

        // Get or Create Stripe Customer
        const userRef = firestoreDb.collection('users').doc(userId);
        const userSnap = await userRef.get();
        const userData = userSnap.data();

        let customerId = userData?.stripeCustomerId;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: email || undefined,
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

export async function createPromotionCheckoutSession(idToken: string, productId: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const { uid: userId } = decodedToken;

        const stripe = getStripe();

        const productRef = firestoreDb.collection('products').doc(productId);
        const productSnap = await productRef.get();

        if (!productSnap.exists) {
            throw new Error("Product not found");
        }

        const product = productSnap.data();
        if (product?.sellerId !== userId) {
            throw new Error("Unauthorized: You do not own this listing.");
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'aud',
                        product_data: {
                            name: 'Benched Boost: 7 Days Promotion',
                            description: 'Promote your listing to the top of results and the home page for 1 week.',
                            images: [product?.imageUrls?.[0] || ''],
                        },
                        unit_amount: 199, // $1.99 AUD
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/product/${productId}?boost_success=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/product/${productId}?boost_cancel=true`,
            metadata: {
                productId,
                userId,
                type: 'bench_boost',
            },
        });

        // Store the session ID on the product to verify later if needed
        await productRef.update({ promotionSessionId: session.id });

        return { success: true, url: session.url };
    } catch (error: any) {
        console.error("Promotion checkout error:", error);
        return { success: false, error: error.message };
    }
}
