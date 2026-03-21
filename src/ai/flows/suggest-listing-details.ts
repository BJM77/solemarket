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
    config: {
        maxOutputTokens: 400,
        temperature: 0.2,
    },
    prompt: `Act as a professional card and sneaker expert. Analyze the images and/or title to provide precise listing metadata.
    
{{#if title}}Title: {{title}}{{/if}}
{{#if category}}Context: {{category}}{{/if}}
{{#each photoDataUris}}{{media url=this}}{{/each}}

Extract:
1.  **Title**: Concise & SEO-friendly. (e.g. 'Nike Air Jordan 1 High Chicago' or '2019 Panini Prizm Zion Williamson #248')
2.  **Description**: 1-2 lines on key features/condition.
3.  **Price**: Est. market price in AUD (number).
4.  **Category**: 'Sneakers', 'Collector Cards', 'Accessories', 'Streetwear'.
5.  **Sub-Category**: Sport (Cards) or Gender/Type (Sneakers).
6.  **Condition**: 'New with Box', 'Used' (Sneakers) or Grade/Raw (Cards).
7.  **Brand/Manufacturer**: 'Nike', 'Panini', etc.
8.  **Model/Set**: 'Air Jordan 1', 'Prizm', etc.
9.  **Year**: Release year (number).
10. **Details**: Style Code (Sneakers), Card# / Grading Info (Cards).

Return only applicable fields.
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
