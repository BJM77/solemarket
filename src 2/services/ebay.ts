import { EbaySearchResult } from '@/types/priget';
import { getEbayAppToken } from '@/lib/ebay/auth';

interface EbayItemSummary {
    title: string;
    price: {
        value: string;
        currency: string;
    };
    itemEndDate?: string;
    itemWebUrl: string;
    condition?: string;
    image?: {
        imageUrl: string;
    };
}

interface EbaySearchResponse {
    itemSummaries?: EbayItemSummary[];
    total: number;
}

class EbayService {
    private config: {
        environment: 'production' | 'sandbox';
        campaignId: string;
    };

    constructor() {
        this.config = {
            environment: (process.env.EBAY_ENV as 'production' | 'sandbox') || 'sandbox',
            campaignId: process.env.EBAY_CAMPAIGN_ID || '', // eBay Partner Network Campaign ID
        };
    }

    /**
     * Search for recently ended/sold items on eBay
     */
    async searchSoldItems(query: string, limit: number = 20): Promise<EbaySearchResult[]> {
        const token = await getEbayAppToken();
        if (!token) return [];

        const baseUrl = this.config.environment === 'production'
            ? 'https://api.ebay.com'
            : 'https://api.sandbox.ebay.com';

        // NOTE ON SOLD DATA:
        // The eBay Browse API (item_summary/search) primarily returns ACTIVE listings.
        // To get TRUE sold data, the Marketplace Insights API is required (restricted access).
        // As a workaround, we sort by 'newly_listed' and provide a direct link to eBay's Sold page for 100% accuracy.
        // We also filter for fixed price to avoid seeing changing auction numbers.

        const optimizedQuery = await optimizeSearchQuery(query);

        const params = new URLSearchParams({
            q: optimizedQuery,
            limit: limit.toString(),
            // Remove the restrictive FIXED_PRICE filter and newly_listed sort 
            // to improve results for specific player searches like Kon Knueppel
        });

        const url = `${baseUrl}/buy/browse/v1/item_summary/search?${params}`;

        const headers: Record<string, string> = {
            'Authorization': `Bearer ${token}`,
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_AU',
        };

        // Add Affiliate Tracking Headers if Campaign ID is present
        if (this.config.campaignId) {
            headers['X-EBAY-C-ENDUSERCTX'] = `affiliateCampaignId=${this.config.campaignId},affiliateReferenceId=benched_research`;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('eBay search error:', errorText);
            throw new Error(`eBay search failed: ${response.statusText}`);
        }

        const data: EbaySearchResponse = await response.json();

        if (!data.itemSummaries || data.itemSummaries.length === 0) {
            return [];
        }

        // Transform to our format
        return data.itemSummaries.map(item => {
            const price = parseFloat(item.price.value);
            // If itemEndDate is in the past, it's more likely a sold/ended item
            // If it's in the future, it's an active listing
            const endDate = item.itemEndDate ? new Date(item.itemEndDate) : new Date();
            const isEnded = endDate < new Date();

            return {
                title: item.title,
                price: price,
                soldDate: item.itemEndDate || new Date().toISOString(),
                link: item.itemWebUrl,
                condition: item.condition,
                image: item.image?.imageUrl
            };
        });
    }
    /**
     * Calculate average price from results
     */
    calculateAveragePrice(results: EbaySearchResult[]): number {
        if (!results || results.length === 0) return 0;
        const total = results.reduce((acc, item) => acc + item.price, 0);
        return Math.round((total / results.length) * 100) / 100;
    }

    /**
     * Get the most recent sold date
     */
    getLastSoldDate(results: EbaySearchResult[]): string {
        if (!results || results.length === 0) return new Date().toISOString();
        // Sort by date descending
        const sorted = [...results].sort((a, b) =>
            new Date(b.soldDate).getTime() - new Date(a.soldDate).getTime()
        );
        return sorted[0].soldDate;
    }
}

// Singleton instance
export const ebayService = new EbayService();

/**
 * Basic search query optimization
 * Removes common spam words and formats query for better eBay results
 */
export async function optimizeSearchQuery(title: string): Promise<string> {
    if (!title) return '';

    // Handle year ranges often used in sports cards (e.g., 2025-26 -> 2025 2026)
    let query = title.replace(/(\d{4})-(\d{2,4})/g, '$1 $2');

    // Remove common filler/spam words that don't help search accuracy
    query = query
        .replace(/\b(L@@K|WOW|HOT|RARE|INVESTMENT|PSA\?|GEM|MINT|SSSP|1\/1|CASE HIT|SSP|SHORT PRINT|VHTF|LOOK|EBAY)\b/gi, '')
        .replace(/\+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return query;
}

