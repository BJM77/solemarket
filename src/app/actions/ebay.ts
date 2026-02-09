'use server';

import { ebayService } from '@/services/ebay';

export async function searchEbaySoldListings(query: string) {
    try {
        if (!query) return [];

        const results = await ebayService.searchSoldItems(query, 5);
        return results;
    } catch (error: any) {
        console.error('Failed to search eBay:', error.message);
        throw new Error('Failed to fetch market data. Please try again.');
    }
}
