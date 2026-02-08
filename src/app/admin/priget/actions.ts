'use server';

/**
 * Priget Server Actions
 * Market data fetching and price updates
 */

import { firestoreDb } from '@/lib/firebase/admin';
import { ebayService, optimizeSearchQuery } from '@/services/ebay';
import { MarketData, BatchProcessResult, PriceFlag } from '@/types/priget';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Fetch market data for a single product from eBay
 */
export async function getMarketData(productId: string): Promise<MarketData | null> {
    try {
        // Get product details
        const productDoc = await firestoreDb.collection('products').doc(productId).get();

        if (!productDoc.exists) {
            throw new Error('Product not found');
        }

        const product = productDoc.data();
        const productTitle = product?.title || '';

        // Optimize search query
        const searchQuery = await optimizeSearchQuery(productTitle);

        // Search eBay for sold items
        const results = await ebayService.searchSoldItems(searchQuery, 10);

        if (results.length === 0) {
            return null;
        }

        // Calculate market data
        const averageSoldPrice = ebayService.calculateAveragePrice(results);
        const lastSoldDate = ebayService.getLastSoldDate(results);
        const suggestedPrice = Math.round(averageSoldPrice * 0.95 * 100) / 100; // 5% below average

        const now = Timestamp.now();
        const marketData: any = {
            lastCheckedAt: { seconds: now.seconds, nanoseconds: now.nanoseconds },
            averageSoldPrice,
            lastSoldDate,
            suggestedPrice,
            ebayLink: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchQuery)}&LH_Sold=1`,
            sampleSize: results.length,
        };

        // Update product with market data
        const updateNow = Timestamp.now();
        await firestoreDb.collection('products').doc(productId).update({
            marketData,
            updatedAt: { seconds: updateNow.seconds, nanoseconds: updateNow.nanoseconds },
        });

        return marketData;
    } catch (error) {
        console.error(`Error fetching market data for ${productId}:`, error);
        return null;
    }
}

/**
 * Batch fetch market data with rate limiting
 */
export async function batchGetMarketData(
    productIds: string[],
    batchSize: number = 5,
    cooldownMs: number = 3000
): Promise<BatchProcessResult[]> {
    const results: BatchProcessResult[] = [];

    for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize);

        // Process batch in parallel
        const batchPromises = batch.map(async (productId) => {
            try {
                const marketData = await getMarketData(productId);
                return {
                    productId,
                    success: marketData !== null,
                    marketData: marketData || undefined,
                };
            } catch (error: any) {
                return {
                    productId,
                    success: false,
                    error: error.message,
                };
            }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Cooldown between batches (except for last batch)
        if (i + batchSize < productIds.length) {
            await new Promise(resolve => setTimeout(resolve, cooldownMs));
        }
    }

    return results;
}

/**
 * Update product price
 */
export async function updateProductPrice(
    productId: string,
    newPrice: number
): Promise<void> {
    await firestoreDb.collection('products').doc(productId).update({
        price: newPrice,
        updatedAt: Timestamp.now(),
    });
}

/**
 * Bulk update prices to suggested values
 */
export async function bulkUpdateToSuggested(productIds: string[]): Promise<number> {
    let updatedCount = 0;

    for (const productId of productIds) {
        try {
            const productDoc = await firestoreDb.collection('products').doc(productId).get();
            const product = productDoc.data();

            if (product?.marketData?.suggestedPrice) {
                await updateProductPrice(productId, product.marketData.suggestedPrice);
                updatedCount++;
            }
        } catch (error) {
            console.error(`Error updating price for ${productId}:`, error);
        }
    }

    return updatedCount;
}



/**
 * Get products for Priget dashboard
 */
export async function getPrigetProducts(limit: number = 50) {
    const snapshot = await firestoreDb
        .collection('products')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    }));
}
