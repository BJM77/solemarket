
'use server';

/**
 * @fileOverview A flow to suggest listing details based on uploaded images.
 * This uses a generative AI model to analyze images and suggest a title, description, price, etc.
 */
import { ai } from '@/ai/genkit';
import { suggestListingDetailsInputSchema, suggestListingDetailsOutputSchema } from './schemas';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { logAIUsage } from '@/services/ai-usage';

export async function suggestListingDetails(input: import('./schemas').SuggestListingDetailsInput): Promise<import('./schemas').SuggestListingDetailsOutput> {
    try {
        console.log('🚀 [Server] suggestListingDetails called');
        console.log('📊 [Server] Input images count:', input.photoDataUris?.length);

        await verifyIdToken(input.idToken);

        // Pre-process images: Convert URLs to Data URIs (Base64)
        // This ensures Gemini receives the image data directly, avoiding access/CORS issues with Firebase Storage URLs.
        if (input.photoDataUris && input.photoDataUris.length > 0) {
            console.log('🔄 [Server] converting URLs to Base64...');
            const processedImages = await Promise.all(input.photoDataUris.map(async (uri) => {
                if (uri.startsWith('http')) {
                    try {
                        const response = await fetch(uri);
                        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
                        const arrayBuffer = await response.arrayBuffer();
                        const base64String = Buffer.from(arrayBuffer).toString('base64');
                        const mimeType = response.headers.get('content-type') || 'image/jpeg';
                        // Return standard data URI format
                        return `data:${mimeType};base64,${base64String}`;
                    } catch (fetchErr) {
                        console.error('❌ [Server] Failed to fetch image for AI analysis:', fetchErr);
                        throw new Error('Failed to download one or more images for analysis.');
                    }
                }
                return uri; // Already a data URI or invalid
            }));

            input.photoDataUris = processedImages;
            console.log('✅ [Server] Conversion complete. Payload ready.');
        }

        const result = await suggestListingDetailsFlow(input);

        // Log Usage
        const decodedToken = await verifyIdToken(input.idToken);
        await logAIUsage('Listing Suggestion', 'vision_analysis', decodedToken.uid);

        return result;

    } catch (error: any) {
        console.error('❌ [Server] suggestListingDetails failed:', error);
        throw new Error(error.message || 'AI analysis service failed.');
    }
}
export type SuggestListingDetailsOutput = import('./schemas').SuggestListingDetailsOutput;

const suggestListingDetailsPrompt = ai.definePrompt({
    name: 'suggestListingDetailsPrompt',
    model: 'googleai/gemini-flash-latest',
    input: { schema: suggestListingDetailsInputSchema },
    output: { schema: suggestListingDetailsOutputSchema },
    prompt: `You are an expert in valuing and listing collectibles. Analyze the provided information (images and/or title) to generate listing details.

{{#if title}}
Provided Title: {{title}}
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
1.  **Title:** A concise, descriptive, and SEO-friendly title. Include key identifiers like name, year, and brand. (Refine the provided title if necessary).
2.  **Description:** A one-to-two-line description highlighting key features and condition.
3.  **Price:** An estimated market price in AUD (Australian Dollars). Be realistic based on the visual information or title.
4.  **Category:** Choose the single best category from this list: 'Collector Cards', 'Coins', 'Collectibles'.
5.  **Sub-Category:** Choose the most specific sub-category based on the main category. For 'Collector Cards', choose from: 'Sports Cards', 'Trading Cards'. For 'Coins', use: 'Coins', 'World Coins', 'Ancient Coins', 'Bullion'. For 'Collectibles', use: 'Stamps', 'Comics', 'Figurines', 'Toys', 'Shoes', 'Memorabilia'.
6.  **Condition:** Assess the item's condition from this list: 'Mint', 'Near Mint', 'Excellent', 'Good', 'Fair', 'Poor'. If no images are provided, default to 'Good' or make a safe assumption based on context.
7.  **Manufacturer:** Identify the manufacturer or brand.
8.  **Year:** Estimate the year of manufacture or release.
9.  **Card Number:** If it's a collector card, identify the card number (e.g., '4/102', 'RC25'). If not applicable, leave blank.
`,
});

const suggestListingDetailsFlow = ai.defineFlow(
    {
        name: 'suggestListingDetailsFlow',
        inputSchema: suggestListingDetailsInputSchema,
        outputSchema: suggestListingDetailsOutputSchema,
    },
    async (input) => {
        const { output } = await suggestListingDetailsPrompt(input);
        if (!output) {
            throw new Error('Failed to get a response from the AI model for listing details.');
        }
        return output;
    }
);
