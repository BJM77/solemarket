/**
 * eBay API Integration Service
 * Handles market data fetching from eBay Browse API
 */

import { EbaySearchResult } from '@/types/priget';

interface EbayConfig {
    clientId: string;
    clientSecret: string;
    environment: 'production' | 'sandbox';
}

interface EbayAuthResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
}

interface EbayItemSummary {
    title: string;
    price: {
        value: string;
        currency: string;
    };
    itemEndDate?: string;
    itemWebUrl: string;
    condition?: string;
}

interface EbaySearchResponse {
    itemSummaries?: EbayItemSummary[];
    total: number;
}

class EbayService {
    private config: EbayConfig;
    private accessToken: string | null = null;
    private tokenExpiry: number = 0;

    constructor() {
        this.config = {
            clientId: process.env.EBAY_CLIENT_ID || '',
            clientSecret: process.env.EBAY_CLIENT_SECRET || '',
            environment: (process.env.EBAY_ENVIRONMENT as 'production' | 'sandbox') || 'production',
        };
    }

    /**
     * Get OAuth access token
     */
    private async getAccessToken(): Promise<string> {
        // Return cached token if still valid
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        const baseUrl = this.config.environment === 'production'
            ? 'https://api.ebay.com'
            : 'https://api.sandbox.ebay.com';

        const credentials = Buffer.from(
            `${this.config.clientId}:${this.config.clientSecret}`
        ).toString('base64');

        const response = await fetch(`${baseUrl}/identity/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${credentials}`,
            },
            body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
        });

        if (!response.ok) {
            throw new Error(`eBay auth failed: ${response.statusText}`);
        }

        const data: EbayAuthResponse = await response.json();
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 min early

        return this.accessToken;
    }

    /**
     * Search for sold items on eBay
     */
    async searchSoldItems(query: string, limit: number = 10): Promise<EbaySearchResult[]> {
        const token = await this.getAccessToken();

        const baseUrl = this.config.environment === 'production'
            ? 'https://api.ebay.com'
            : 'https://api.sandbox.ebay.com';

        // Build search URL with filters
        const params = new URLSearchParams({
            q: query,
            limit: limit.toString(),
            filter: 'buyingOptions:{FIXED_PRICE},conditions:{USED|NEW}',
            sort: 'price', // Sort by price for consistency
        });

        const url = `${baseUrl}/buy/browse/v1/item_summary/search?${params}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
                'X-EBAY-C-ENDUSERCTX': 'affiliateCampaignId=<ePNCampaignId>',
            },
        });

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
        }));
    }

    /**
     * Calculate average sold price from results
     */
    calculateAveragePrice(results: EbaySearchResult[]): number {
        if (results.length === 0) return 0;

        const sum = results.reduce((acc, item) => acc + item.price, 0);
        return Math.round((sum / results.length) * 100) / 100; // Round to 2 decimals
    }

    /**
     * Get the most recent sold date
     */
    getLastSoldDate(results: EbaySearchResult[]): string {
        if (results.length === 0) return new Date().toISOString();

        const dates = results
            .map(r => new Date(r.soldDate))
            .sort((a, b) => b.getTime() - a.getTime());

        return dates[0].toISOString();
    }
}

// Singleton instance
export const ebayService = new EbayService();

/**
 * Helper to optimize search query using AI
 */
export async function optimizeSearchQuery(productTitle: string): Promise<string> {
    // For now, basic cleaning - can be enhanced with Gemini later
    return productTitle
        .replace(/[^\w\s-]/g, '') // Remove special chars
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
}
