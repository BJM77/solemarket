/**
 * Priget Utility Functions
 */

import { PriceFlag } from '@/types/priget';

/**
 * Calculate price flag for a product
 */
export function calculatePriceFlag(
    currentPrice: number,
    averageSoldPrice: number
): PriceFlag {
    const difference = currentPrice - averageSoldPrice;
    const percentage = Math.round((difference / averageSoldPrice) * 100);

    let status: PriceFlag['status'];
    if (Math.abs(percentage) <= 10) {
        status = 'competitive';
    } else if (percentage > 10) {
        status = 'overpriced';
    } else {
        status = 'underpriced';
    }

    return { status, percentage };
}
