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

        const result = await bulkSuggestCardsFlow(input);

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
    model: 'googleai/gemini-1.5-flash',
    input: { schema: bulkSuggestCardsInputSchema },
    output: { schema: bulkSuggestCardsOutputSchema },
    prompt: `You are an expert at identifying and valuing sports and collector cards. 
Analyze the provided batch of images. Each image represents ONE card.
For each image, provide the following details in a list:

1. **id:** The original index of the image in the provided list (e.g., "0", "1").
2. **title:** A professional listing title (e.g., "2019 Panini Prizm Zion Williamson #248").
3. **description:** A brief description of the card.
4. **price:** Estimated market price in AUD (Australian Dollars).
5. **subCategory:** The sport/type (e.g., 'Basketball Cards').
6. **condition:** Estimated condition/grade (e.g., 'Raw', 'Near Mint', 'PSA 10').
7. **brand:** The manufacturer (e.g., 'Panini', 'Topps', 'Upper Deck').
8. **model:** The set name (e.g., 'Prizm', 'Optic', 'Chrome').
9. **year:** Release year.
10. **cardNumber:** The specific card number (e.g., #248).
11. **gradingCompany:** PSA, BGS, SGC if visible/slabbed.
12. **grade:** Numeric or descriptive grade.

Images:
{{#each photoDataUris}}
- Image {{ @index }}: {{media url=this}}
{{/each}}

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
