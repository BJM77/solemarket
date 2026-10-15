/**
 * Feature flags. Card payments (Stripe) are OFF until Ben turns them on; the code is kept.
 * Set NEXT_PUBLIC_STRIPE_ENABLED=true (build-time, apphosting.yaml) to re-enable.
 */
export const STRIPE_ENABLED = process.env.NEXT_PUBLIC_STRIPE_ENABLED === 'true';

export const STRIPE_DISABLED_MESSAGE = 'Card payments are not available yet. Benched currently supports PayID and cash on pickup.';
