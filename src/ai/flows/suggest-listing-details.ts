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

        let decodedToken;
        try {
            decodedToken = await verifyIdToken(input.idToken);
        } catch (authErr: any) {
            console.error('❌ [Server] verifyIdToken failed:', authErr);
            return { error: `Authentication failed: ${authErr.message}` };
        }

        // Pre-process images: Convert URLs to Data URIs (Base64) only if necessary
        if (input.photoDataUris && input.photoDataUris.length > 0) {
            console.log('🔄 [Server] checking image formats...');
            const processedImages = await Promise.all(input.photoDataUris.map(async (uri) => {
                if (uri.startsWith('http')) {
                    try {
                        console.log(`🌐 [Server] Fetching remote image: ${uri.substring(0, 50)}...`);
                        const response = await fetch(uri);
                        if (!response.ok) {
                            console.error(`❌ [Server] Failed to fetch image: ${response.status} ${response.statusText}`);
                            throw new Error(`Failed to fetch image: ${response.statusText}`);
                        }
                        const arrayBuffer = await response.arrayBuffer();
                        const base64String = Buffer.from(arrayBuffer).toString('base64');
                        const mimeType = response.headers.get('content-type') || 'image/jpeg';
                        return `data:${mimeType};base64,${base64String}`;
                    } catch (fetchErr: any) {
                        console.error('❌ [Server] Image fetch exception:', fetchErr.message);
                        throw new Error(`AI was unable to access the image URL. Error: ${fetchErr.message}`);
                    }
                }
                return uri; // Already a data URI (compressed locally by client)
            }));

            input.photoDataUris = processedImages;
        }

        const result = await suggestListingDetailsFlow(input);

        // Log Usage using the already verified token or decoded payload
        await logAIUsage('Listing Suggestion', 'vision_analysis', decodedToken.uid);

        return { data: result };

    } catch (error: any) {
        console.error('❌ [Server] suggestListingDetails failed:', error);
        return { error: error.message || 'AI analysis service failed.' };
    }
}

const suggestListingDetailsPrompt = ai.definePrompt({
    name: 'suggestListingDetailsPrompt',
    model: 'googleai/gemini-flash-latest',
    input: { schema: suggestListingDetailsInputSchema },
    output: { schema: suggestListingDetailsOutputSchema },
    prompt: `You are an expert in valuing and listing authentic sneakers, streetwear, and trading cards. Analyze the provided information (images and/or title) to generate detailed listing metadata.

{{#if title}}
Provided Title: {{title}}
{{/if}}

{{#if category}}
Selected Category Context: {{category}}
{{/if}}

{{#if photoDataUris.length}}
Images for Analysis:
{{#each photoDataUris}}
- {{media url=this}}
{{/each}}
{{else}}
(No images provided. Base your analysis solely on the title if available.)
{{/if}}

Based on the images and/or title, provide the following details:
1.  **Title:** A concise, descriptive, and SEO-friendly title. 
    - Sneakers: Brand Model Colorway (e.g., 'Nike Air Jordan 1 High Chicago')
    - Cards: Year Set Player Card# (e.g., '2019 Panini Prizm Zion Williamson #248')
2.  **Description:** A professional one-to-two line description highlighting key features, set names, or condition notes.
3.  **Price:** An estimated market price in AUD (Australian Dollars). Return as a number.
4.  **Category:** Choose the most appropriate: 'Sneakers', 'Collector Cards', 'Accessories', 'Streetwear'.
5.  **Sub-Category:** 
    - For Sneakers: 'Men\'s Sneakers', 'Women\'s Sneakers', etc.
    - For Cards: The sport or type (e.g., 'Basketball Cards', 'Pokémon').
6.  **Condition:** 
    - Sneakers: 'New with Box', 'Used', etc.
    - Cards: The estimated grade (e.g., 'Mint 9', 'Near Mint 7', 'Raw', 'PSA 10' if slabbed).
7.  **Brand/Manufacturer:** e.g., 'Nike', 'Adidas', 'Panini', 'Topps', 'Upper Deck'.
8.  **Model/Set:** The specific model (Sneakers) or Set Name (Cards, e.g., 'Prizm', 'Chrome').
9.  **Style Code:** For sneakers only (e.g., 'DZ5485-612').
10. **Colorway:** For sneakers only (e.g., 'Chicago', 'Zebra').
11. **Size:** For sneakers only (e.g., 'US 10.5').
12. **Year:** Release year as a number.
13. **Grading Info:** If it's a graded card, identify the Grading Company (PSA, BGS, SGC) and the Grade.

Return all applicable fields. If a field is unknown, omit it or leave it as null/empty string.
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
