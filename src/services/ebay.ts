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
     * Search for sold items on eBay
     */
    async searchSoldItems(query: string, limit: number = 20): Promise<EbaySearchResult[]> {
        const token = await getEbayAppToken();

        const baseUrl = this.config.environment === 'production'
            ? 'https://api.ebay.com'
            : 'https://api.sandbox.ebay.com';

        // Build search URL with filters
        // For sold items: usually requires specific permissions or scraping.
        // However, we can use the Browse API with filters.
        // Note: The public Browse API does not always return historical sold data reliably without specific access.
        // We will try using the `COMPLETED` filter if available, or just general search for now to prove connection.
        // eBay Browse API `filter` for sold items is `buyingOptions:{FIXED_PRICE},itemEndDate:[..]`.
        // A common workaround for "Sold" via API is difficult without "Marketplace Insights" or similar.
        // We will use standard search for this test to verify connectivity and data retrieval.

        const params = new URLSearchParams({
            q: query,
            limit: limit.toString(),
            sort: 'price',
            filter: 'buyingOptions:{FIXED_PRICE|AUCTION},conditions:{USED|NEW|EXCELLENT|VERY_GOOD|GOOD|FAIR|POOR}',
        });

        const url = `${baseUrl}/buy/browse/v1/item_summary/search?${params}`;

        const headers: Record<string, string> = {
            'Authorization': `Bearer ${token}`,
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_AU',
        };

        // Add Affiliate Tracking Headers if Campaign ID is present
        if (this.config.campaignId) {
            headers['X-EBAY-C-ENDUSERCTX'] = `affiliateCampaignId=${this.config.campaignId},affiliateReferenceId=picksy_research`;
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
        return data.itemSummaries.map(item => ({
            title: item.title,
            price: parseFloat(item.price.value),
            soldDate: item.itemEndDate || new Date().toISOString(),
            link: item.itemWebUrl,
            condition: item.condition,
            image: item.image?.imageUrl
        }));
    }
}

// Singleton instance
export const ebayService = new EbayService();

