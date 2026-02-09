import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { ebayService } from '@/services/ebay';

export const keywordSearchSales = ai.defineTool(
    {
        name: 'keywordSearchSales',
        description: 'Search for recent sold listings of trading cards to determine market value.',
        inputSchema: z.object({
            query: z.string().describe('The search query (e.g., "1986 Fleer Michael Jordan rookie PSA 8"). Be specific with year, set, player, and variant.'),
        }),
        outputSchema: z.object({
            averagePrice: z.number().nullable().describe('The calculated average sold price.'),
            salesCount: z.number().describe('Number of sold listings found.'),
            recentSales: z.array(z.object({
                title: z.string(),
                price: z.number(),
                date: z.string(),
                link: z.string(),
            })).describe('List of recent sold items used for calculation.'),
        }),
    },
    async ({ query }) => {
        try {
            console.log(`[AI Tool] Searching eBay Sales for: "${query}"`);
            const results = await ebayService.searchSoldItems(query, 10); // Fetch top 10 for better average

            if (!results || results.length === 0) {
                return {
                    averagePrice: null,
                    salesCount: 0,
                    recentSales: [],
                };
            }

            // Calculate average
            const total = results.reduce((sum, item) => sum + item.price, 0);
            const averagePrice = results.length > 0 ? total / results.length : null;

            return {
                averagePrice: averagePrice ? Math.round(averagePrice * 100) / 100 : null,
                salesCount: results.length,
                recentSales: results.map(r => ({
                    title: r.title,
                    price: r.price,
                    date: r.soldDate,
                    link: r.link
                })),
            };
        } catch (error) {
            console.error('[AI Tool] eBay Search Failed:', error);
            return {
                averagePrice: null,
                salesCount: 0,
                recentSales: [],
            };
        }
    }
);
