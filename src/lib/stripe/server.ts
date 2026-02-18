import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecretKey 
    ? new Stripe(stripeSecretKey, { typescript: true })
    : null as unknown as Stripe;

/**
 * Helper to ensure stripe is initialized before use in server-side logic.
 * Throws a helpful error if called when STRIPE_SECRET_KEY is missing.
 */
export function getStripe() {
    if (!stripe) {
        throw new Error('STRIPE_SECRET_KEY is not defined. Stripe integration is disabled or misconfigured.');
    }
    return stripe;
}
