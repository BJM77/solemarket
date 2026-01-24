'use server';

/**
 * @fileOverview A flow to extract detailed card information including player name, brand, type, sport, and year.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractCardNameInputSchema = z.object({
    cardImageDataUri: z
        .string()
        .describe(
            "A photo of a trading card, as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
        ),
});
type ExtractCardNameInput = z.infer<typeof ExtractCardNameInputSchema>;

const ExtractCardNameOutputSchema = z.object({
    playerName: z.string().describe('The name of the player on the card.'),
    cardBrand: z.string().optional().describe('The brand/manufacturer of the card (e.g., Panini, Topps, Upper Deck).'),
    cardColor: z.string().optional().describe('The type/color of the card (e.g., Base, Prizm, Refractor, Silver).'),
    sport: z.string().optional().describe('The sport (e.g., Basketball, Baseball, Football, Soccer).'),
    cardYear: z.number().optional().describe('The year the card was produced.'),
    salesData: z.object({
        averagePrice: z.number().optional().nullable(),
        salesCount: z.number().optional().nullable(),
        source: z.string().optional().nullable(),
    }).optional(),
});
export type ExtractCardNameOutput = z.infer<typeof ExtractCardNameOutputSchema>;

export async function extractCardName(
    input: ExtractCardNameInput
): Promise<ExtractCardNameOutput> {
    const result = await extractCardNameFlow(input);
    return result;
}

const prompt = ai.definePrompt({
    name: 'extractCardNamePrompt',
    model: 'googleai/gemini-1.5-flash',
    input: { schema: ExtractCardNameInputSchema },
    output: { schema: ExtractCardNameOutputSchema },
    prompt: `You are an expert at analyzing trading cards. Extract all available information from this card image:

- Player's full name (required)
- Card brand/manufacturer (Panini, Topps, Upper Deck, etc.)
- Card type/color (Base, Prizm, Refractor, Silver, Gold, etc.)
- Sport (Basketball, Baseball, Football, Soccer, etc.)
- Year of production

Be precise and only return what you can clearly see on the card.

Card Image: {{media url=cardImageDataUri}}`,
});

const extractCardNameFlow = ai.defineFlow(
    {
        name: 'extractCardNameFlow',
        inputSchema: ExtractCardNameInputSchema,
        outputSchema: ExtractCardNameOutputSchema,
    },
    async (input) => {
        if (!input.cardImageDataUri.startsWith('data:image/')) {
            throw new Error('Invalid image format. Use JPEG or PNG.');
        }
        const { output } = await prompt(input);
        if (!output?.playerName) {
            throw new Error("Gemini could not detect a player name on the card.");
        }
        return output;
    }
);
