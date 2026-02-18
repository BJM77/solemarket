import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { firestoreDb } from '@/lib/firebase/admin';
import * as admin from 'firebase-admin';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');

    let event;

    try {
        if (!sig || !webhookSecret) {
            throw new Error('Missing signature or webhook secret');
        }
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any;

        if (session.metadata?.type === 'bench_boost' && session.metadata?.productId) {
            const productId = session.metadata.productId;
            console.log(`Fulfilling Bench Boost for product: ${productId}`);

            const productRef = firestoreDb.collection('products').doc(productId);

            // Set expiration to 7 days from now
            const promotionExpiresAt = admin.firestore.Timestamp.fromDate(
                new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            );

            await productRef.update({
                isPromoted: true,
                promotionExpiresAt,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`Product ${productId} is now promoted until ${promotionExpiresAt.toDate()}`);
        }
    }

    return NextResponse.json({ received: true });
}
