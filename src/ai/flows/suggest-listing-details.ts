'use server';

import { ai } from '@/ai/genkit';
import { suggestListingDetailsInputSchema, suggestListingDetailsOutputSchema, type SuggestListingDetailsInput, type SuggestListingDetailsOutput } from './schemas';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { logAIUsage } from '@/services/ai-usage';

export async function suggestListingDetails(input: SuggestListingDetailsInput): Promise<{ data?: SuggestListingDetailsOutput; error?: string }> {
    try {
        console.log('🚀 [Server] suggestListingDetails called');
        console.log('📊 [Server] Input images count:', input.photoDataUris?.length);
        console.log('📊 [Server] Category context:', input.category);

        if (!input.idToken) {
            return { error: 'Authentication token is required.' };
        }

        try {
            await verifyIdToken(input.idToken);
        } catch (authErr: any) {
            console.error('❌ [Server] verifyIdToken failed:', authErr);
            return { error: `Authentication failed: ${authErr.message}` };
        }

        // Pre-process images: Convert URLs to Data URIs (Base64) only if necessary
        if (input.photoDataUris && input.photoDataUris.length > 0) {
            console.log('🔄 [Server] checking image formats...');
            const processedImages = await Promise.all(input.photoDataUris.map(async (uri) => {
                if (uri.startsWith('http')) {
                    console.log('🌐 Fetching remote image for AI analysis');
                    const response = await fetch(uri);
                    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
                    const arrayBuffer = await response.arrayBuffer();
                    const base64String = Buffer.from(arrayBuffer).toString('base64');
                    const mimeType = response.headers.get('content-type') || 'image/jpeg';
                    return `data:${mimeType};base64,${base64String}`;
                }
                return uri; // Already a data URI (compressed locally by client)
            }));

            input.photoDataUris = processedImages;
        }

        const result = await suggestListingDetailsFlow(input);

        // Log Usage
        const decodedToken = await verifyIdToken(input.idToken);
        await logAIUsage('Listing Suggestion', 'vision_analysis', decodedToken.uid);

        return { data: result };

    } catch (error: any) {
        console.error('❌ [Server] suggestListingDetails failed:', error);
        return { error: error.message || 'AI analysis service failed.' };
    }
}

const suggestListingDetailsPrompt = ai.definePrompt({
    name: 'suggestListingDetailsPrompt',
    model: 'googleai/gemini-2.0-flash-exp',
    input: { schema: suggestListingDetailsInputSchema },
    output: { schema: suggestListingDetailsOutputSchema },
    prompt: `You are an expert in valuing and listing authentic sneakers and streetwear. Analyze the provided information (images and/or title) to generate listing details.

{{#if title}}
Provided Title: {{title}}
{{/if}}

{{#if category}}
Selected Category: {{category}}
{{/if}}

{{#if photoDataUris.length}}
Images:
{{#each photoDataUris}}
- {{media url=this}}
{{/each}}
{{else}}
(No images provided. Base your analysis solely on the title.)
{{/if}}

Based on the images and/or title, provide the following details:
1.  **Title:** A concise, descriptive, and SEO-friendly title. For sneakers: Brand, Model, Colorway. For cards: Year, Set, Player, Card #.
2.  **Description:** A one-to-two-line description highlighting key features and condition.
3.  **Price:** An estimated market price in AUD (Australian Dollars).
4.  **Category:** Choose from 'Sneakers', 'Collector Cards'.
5.  **Sub-Category:** (e.g. 'Men's Sneakers', 'Basketball Cards').
6.  **Condition:** For sneakers: 'New with Box', 'Used'. For cards: 'Mint 9', 'Near Mint 7', 'Raw'.
7.  **Brand:** e.g. Nike, Adidas (Sneakers) or Panini, Upper Deck (Cards).
8.  **Model:** e.g. Air Jordan 1 (Sneakers) or Prizm, Optic (Cards).
9.  **Style Code:** For sneakers only (e.g. DZ5485-612).
10. **Colorway:** For sneakers only (e.g. Chicago, Zebra).
11. **Size:** For sneakers only.
12. **Year:** Release year.
13. **Grading Info:** If it's a card, identify Grading Company, Grade, and Card Number.
`,
});

const suggestListingDetailsFlow = ai.defineFlow(
    {
        name: 'suggestListingDetailsFlow',
        inputSchema: suggestListingDetailsInputSchema,
        outputSchema: suggestListingDetailsOutputSchema,
    },
    async (input: SuggestListingDetailsInput) => {
        const { output } = await suggestListingDetailsPrompt(input);
        if (!output) {
            throw new Error("AI failed to return valid metadata.");
        }
        return output;
    }
);
