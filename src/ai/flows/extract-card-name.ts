'use server';

/**
 * @fileOverview A flow to extract detailed card information including player name, brand, type, sport, and year.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { runAIWorkflow } from '../workflow-engine';
import { keywordSearchSales } from '@/ai/tools/ebay-search';

const ExtractCardNameInputSchema = z.object({
    cardImageDataUri: z
        .string()
        .describe(
            "A photo of a trading card, as a data URI."
        ),
    idToken: z.string().optional().describe('Firebase ID Token for auth'),
    userId: z.string().optional().describe('User ID legacy tracking'),
});
type ExtractCardNameInput = z.infer<typeof ExtractCardNameInputSchema>;

const ExtractCardNameOutputSchema = z.object({
    playerName: z.string().describe('The name of the player on the card.'),
    cardBrand: z.string().optional().describe('The brand/manufacturer of the card (e.g., Panini, Upper Deck).'),
    cardColor: z.string().optional().describe('The type/color of the card (e.g., Base, Prizm, Refractor, Silver).'),
    sport: z.string().optional().describe('The sport (e.g., Basketball).'),
    cardYear: z.number().optional().describe('The year the card was produced.'),
    salesData: z.object({
        averagePrice: z.number().optional().nullable(),
        salesCount: z.number().optional().nullable(),
        source: z.string().optional().nullable(),
    }).optional(),
});
export type ExtractCardNameOutput = z.infer<typeof ExtractCardNameOutputSchema>;

export async function extractCardName(input: ExtractCardNameInput): Promise<any> {
    return await runAIWorkflow<ExtractCardNameOutput>(
        input,
        async (validatedInput) => {
            const { output: details } = await prompt(validatedInput);
            if (!details?.playerName) throw new Error("Gemini could not detect a player name.");

            // Enhancement: Search eBay for pricing
            try {
                const query = [
                    details.cardYear,
                    details.cardBrand,
                    details.playerName,
                    details.cardColor,
                    details.sport
                ].filter(Boolean).join(' ');

                const salesData = await keywordSearchSales({ query });
                if (salesData) {
                    details.salesData = {
                        averagePrice: salesData.averagePrice,
                        salesCount: salesData.salesCount,
                        source: 'eBay Sold Listings'
                    };
                }
            } catch (error) {
                console.warn('Failed to fetch pricing data:', error);
            }
            return details;
        },
        {
            feature: 'full-card-scan-extraction',
            usageType: 'vision_analysis',
            maxRetries: 3,
            requireAuth: !!input.idToken
        }
    );
}

const prompt = ai.definePrompt({
    name: 'extractCardNamePrompt',
    model: 'googleai/gemini-flash-latest',
    input: { schema: ExtractCardNameInputSchema },
    output: { schema: ExtractCardNameOutputSchema },
    prompt: `You are an expert at analyzing basketball trading cards. Extract all available information from this card image:

- Player's full name (required)
- Card brand/manufacturer (Panini, Upper Deck, etc.)
- Card type/color (Base, Prizm, Refractor, Silver, Gold, etc.)
- Sport (Basketball only)
- Year of production

Be precise and only return what you can clearly see on the card.

Card Image: {{media url=cardImageDataUri}}`,
});
