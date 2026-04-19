'use server';

import { ai } from '@/ai/genkit';
import { 
    bulkSuggestCardsInputSchema, 
    bulkSuggestCardsOutputSchema, 
    type BulkSuggestCardsInput, 
    type BulkSuggestCardsOutput 
} from './schemas';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { logAIUsage } from '@/services/ai-usage';
import { withRetry } from '../utils/retry';

/**
 * Bulk Suggestion Flow for up to 20 cards.
 */
export async function bulkSuggestCards(input: BulkSuggestCardsInput): Promise<{ data?: BulkSuggestCardsOutput; error?: string }> {
    try {
        console.log('🚀 [Server] bulkSuggestCards called. Images:', input.photoDataUris?.length);

        if (!input.idToken) return { error: 'Authentication required.' };
        if (!input.photoDataUris || input.photoDataUris.length === 0) return { error: 'No images provided.' };

        try {
            await verifyIdToken(input.idToken);
        } catch (authErr: any) {
            return { error: `Authentication failed: ${authErr.message}` };
        }

        const result = await withRetry(async () => {
            return await bulkSuggestCardsFlow(input);
        }, {
            maxRetries: 3,
            onRetry: (err, attempt) => console.log(`[AI Retry] bulkSuggestCards attempt ${attempt} due to high demand...`)
        });

        const decodedToken = await verifyIdToken(input.idToken);
        await logAIUsage('Bulk Card Suggestion', 'vision_analysis', decodedToken.uid);

        return { data: result };

    } catch (error: any) {
        console.error('❌ [Server] bulkSuggestCards failed:', error);
        return { error: error.message || 'Bulk AI analysis service failed.' };
    }
}

const bulkSuggestCardsPrompt = ai.definePrompt({
    name: 'bulkSuggestCardsPrompt',
    model: 'googleai/gemini-flash-latest',
    input: { schema: bulkSuggestCardsInputSchema },
    output: { schema: bulkSuggestCardsOutputSchema },
    prompt: `You are an expert at identifying and valuing sports and collector cards. 
Analyze the provided batch of images. Each image represents ONE card.
For each image, provide detailed listing information.

Images for Analysis:
{{#each photoDataUris}}
- Image {{ @index }}: {{media url=this}}
{{/each}}

Based on the images, provide the following for EACH card in the 'cards' list:
1. **id:** The original index of the image (e.g., "0", "1").
2. **title:** A professional title (e.g., "2019 Panini Prizm Zion Williamson #248").
3. **description:** A brief description of the card.
4. **price:** Estimated market price in AUD (Australian Dollars). Return as a number.
5. **subCategory:** The sport/type (e.g., 'Basketball Cards', 'Pokémon').
6. **condition:** Estimated grade (e.g., 'Raw', 'Near Mint 7', 'PSA 10').
7. **brand:** The manufacturer (e.g., 'Panini', 'Topps', 'Upper Deck').
8. **model:** The set name (e.g., 'Prizm', 'Optic', 'Chrome').
9. **year:** Release year as a number.
10. **cardNumber:** The specific card number (e.g., #248).
11. **gradingCompany:** PSA, BGS, SGC if visible/slabbed.
12. **grade:** Numeric or descriptive grade.

Ensure the 'id' field in your response matches the index of the image correctly.
`,
});

const bulkSuggestCardsFlow = ai.defineFlow(
    {
        name: 'bulkSuggestCardsFlow',
        inputSchema: bulkSuggestCardsInputSchema,
        outputSchema: bulkSuggestCardsOutputSchema,
    },
    async (input: BulkSuggestCardsInput) => {
        const { output } = await bulkSuggestCardsPrompt(input);
        if (!output) throw new Error("AI failed to return valid metadata for the batch.");
        return output;
    }
);
