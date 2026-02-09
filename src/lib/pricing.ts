import { MultibuyTier } from '@/types/multibuy';

/**
 * Calculates the total price for a specific cart item, applying multibuy discounts if applicable.
 */
export function calculateItemTotal(price: number, quantity: number, multibuyEnabled?: boolean, tiers?: MultibuyTier[]) {
    if (!multibuyEnabled || !tiers || tiers.length === 0 || quantity < 2) {
        return price * quantity;
    }

    // Find applicable tier (highest quantity that's <= purchased quantity)
    const applicableTier = [...tiers]
        .filter(tier => quantity >= tier.minQuantity)
        .sort((a, b) => b.minQuantity - a.minQuantity)[0];

    if (!applicableTier) {
        return price * quantity;
    }

    const discountMultiplier = 1 - (applicableTier.discountPercent / 100);
    return price * quantity * discountMultiplier;
}

/**
 * Calculates shipping cost based on subtotal and system settings.
 */
export function calculateShipping(
    subtotal: number, 
    method: 'pickup' | 'shipping', 
    settings: { freightCharge: number; freeShippingThreshold: number }
) {
    if (method === 'pickup') return 0;
    return subtotal >= settings.freeShippingThreshold ? 0 : settings.freightCharge;
}

/**
 * Calculates tax amount.
 */
export function calculateTax(subtotal: number, taxRate: number) {
    return subtotal * taxRate;
}
