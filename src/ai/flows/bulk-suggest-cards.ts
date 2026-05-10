'use server';

import { ai } from '@/ai/genkit';
import { 
    bulkSuggestCardsInputSchema, 
    bulkSuggestCardsOutputSchema, 
    type BulkSuggestCardsInput, 
    type BulkSuggestCardsOutput 
} from './schemas';
import { runAIWorkflow } from '../workflow-engine';

/**
 * Bulk Suggestion Flow for up to 20 cards (Gemini 2.0 Enhanced).
 * Transitioned to storage-first architecture: pass URLs whenever possible.
 */
export async function bulkSuggestCards(input: BulkSuggestCardsInput): Promise<any> {
    return await runAIWorkflow<BulkSuggestCardsOutput>(
        input,
        async (validatedInput) => {
            const { output } = await bulkSuggestCardsPrompt(validatedInput);
            if (!output) throw new Error("AI failed to return valid metadata for the batch.");
            return output;
        },
        {
            feature: 'bulk-card-suggestion',
            usageType: 'vision_analysis',
            maxRetries: 3
        }
    );
}

const bulkSuggestCardsPrompt = ai.definePrompt({
    name: 'bulkSuggestCardsPrompt',
    model: 'googleai/gemini-2.0-flash',
    input: { schema: bulkSuggestCardsInputSchema },
    output: { schema: bulkSuggestCardsOutputSchema },
    prompt: `You are a world-class expert at identifying and valuing sports and collector cards. 
Analyze the provided batch of images. Each image represents ONE card.
For each image, provide high-precision listing information.

Images for Analysis:
{{#each photoDataUris}}
- Image {{ @index }}: {{media url=this}}
{{/each}}

Based on the images, provide the following for EACH card in the 'cards' list:
1. **id:** The original index of the image (e.g., "0", "1").
2. **title:** A professional, SEO-friendly title (e.g., "2019 Panini Prizm Zion Williamson #248").
3. **description:** A brief, punchy description (1 line).
4. **price:** Estimated market price in AUD (number).
5. **subCategory:** The sport/type (e.g., 'Basketball Cards', 'Pokémon').
6. **condition:** Estimated grade (e.g., 'Raw', 'Near Mint 7', 'PSA 10').
7. **brand:** The manufacturer (e.g., 'Panini', 'Topps').
8. **model:** The set name (e.g., 'Prizm', 'Optic').
9. **year:** Release year (number).
10. **cardNumber:** The specific card number (e.g., #248).
11. **gradingCompany:** PSA, BGS, SGC, Raw.
12. **grade:** Numeric or descriptive grade.

Ensure the 'id' field matches the index of the image perfectly.
`,
});
