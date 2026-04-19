'use server';

import { ai } from '@/ai/genkit';
import { suggestListingDetailsInputSchema, suggestListingDetailsOutputSchema, type SuggestListingDetailsInput, type SuggestListingDetailsOutput } from './schemas';
import { runAIWorkflow } from '../workflow-engine';

/**
 * Main Vision flow for generating listing suggestions from photos.
 */
export async function suggestListingDetails(input: SuggestListingDetailsInput): Promise<any> {
    return await runAIWorkflow<SuggestListingDetailsOutput>(
        input,
        async (validatedInput) => {
            // Pre-process images: Convert URLs to Data URIs (Base64) only if necessary
            if (validatedInput.photoDataUris && validatedInput.photoDataUris.length > 0) {
                const processedImages = await Promise.all(validatedInput.photoDataUris.map(async (uri: string) => {
                    if (uri.startsWith('http')) {
                        const response = await fetch(uri);
                        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
                        const arrayBuffer = await response.arrayBuffer();
                        const base64String = Buffer.from(arrayBuffer).toString('base64');
                        const mimeType = response.headers.get('content-type') || 'image/jpeg';
                        return `data:${mimeType};base64,${base64String}`;
                    }
                    return uri;
                }));
                validatedInput.photoDataUris = processedImages;
            }

            const { output } = await suggestListingDetailsPrompt(validatedInput);
            if (!output) throw new Error("AI failed to return valid metadata.");
            return output;
        },
        {
            feature: 'listing-details-vision',
            usageType: 'vision_analysis',
            maxRetries: 3
        }
    );
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
1.  **Title**: Concise & SEO-friendly.
2.  **Description**: 1-2 lines on key features/condition.
3.  **Price**: Est. market price in AUD (number).
4.  **Category**: MUST be one of: 'Sneakers', 'Collector Cards', 'Accessories', 'Streetwear'.
5.  **Sub-Category**: Sport (Cards) or Gender/Type (Sneakers).
6.  **Condition**: MUST be one of: 'New', 'Used', 'Mint', 'Near Mint', 'Excellent', 'Good', 'Fair'.
7.  **Brand/Manufacturer**: 'Nike', 'Panini', etc.
8.  **Model/Set**: 'Air Jordan 1', 'Prizm', etc.
9.  **Year**: Release year (number).
10. **Details**: Style Code (Sneakers), Card# / Grading Info (Cards).

Return only applicable fields.
Populate **suggestedFields** with the keys of all fields you have successfully identified (e.g. ["title", "brand", "price"]).
`,
});
