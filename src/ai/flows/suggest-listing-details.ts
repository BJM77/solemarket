'use server';

import { ai } from '@/ai/genkit';
import { suggestListingDetailsInputSchema, suggestListingDetailsOutputSchema, type SuggestListingDetailsInput, type SuggestListingDetailsOutput } from './schemas';
import { runAIWorkflow } from '../workflow-engine';
import { AI_CONFIG } from '@/config/ai';

/**
 * Main Vision flow for generating listing suggestions from photos.
 * Transitioned to storage-first architecture: pass URLs whenever possible.
 */
export async function suggestListingDetails(input: SuggestListingDetailsInput): Promise<any> {
    return await runAIWorkflow<SuggestListingDetailsOutput>(
        input,
        async (validatedInput) => {
            // Note: validatedInput.photoDataUris can contain either public URLs or Data URIs.
            
            try {
                // 1. Primary Attempt: Use default high-performance flash vision model
                const { output } = await suggestListingDetailsPrompt(validatedInput);
                if (!output) throw new Error("AI failed to return valid metadata.");
                return output;
            } catch (error: any) {
                console.warn("Primary Gemini Vision Model failed or overloaded. Initiating model fallback chain...", error.message || error);
                
                try {
                    // 2. Secondary Attempt: Fallback to high-capacity Gemini 1.5 Pro
                    const { output } = await suggestListingDetailsPrompt(validatedInput, {
                        model: 'googleai/gemini-1.5-pro-latest'
                    });
                    if (output) {
                        console.log("AI workflow successfully recovered using Gemini 1.5 Pro.");
                        return output;
                    }
                } catch (fallbackError: any) {
                    console.error("Secondary Gemini 1.5 Pro fallback also failed:", fallbackError.message || fallbackError);
                }

                // If fallback chain is exhausted, re-throw the original error to activate workflow retries / graceful UI degradation
                throw error;
            }
        },
        {
            feature: 'listing-details-suggester',
            usageType: 'vision_analysis',
            maxRetries: 2
        }
    );
}

const suggestListingDetailsPrompt = ai.definePrompt({
    name: 'suggestListingDetailsPrompt',
    model: AI_CONFIG.DEFAULT_VISION_MODEL,
    input: { schema: suggestListingDetailsInputSchema },
    output: { schema: suggestListingDetailsOutputSchema },
    config: {
        maxOutputTokens: 2000,
        temperature: 0.1,
    },
    prompt: `Act as a world-class grading expert, numismatist, and sneaker specialist. Analyze the provided images or title text to output extremely precise marketplace listing metadata.

{{#if title}}Title Context: {{title}}{{/if}}
{{#if category}}Category Context: {{category}}{{/if}}

Images for Analysis:
{{#each photoDataUris}}
- Image {{ @index }}: {{media url=this}}
{{/each}}

You must analyze all uploaded images (which may show the front, back, interior tags, or side of the item) and classify the item into one of the following exact categories: 'Sneakers', 'Collector Cards', 'Streetwear', 'Accessories'.

### CRITICAL RULES FOR TRADING CARDS:
A user's trading card listing must have high-fidelity details extracted from BOTH the front and back images.
1. Player Name: Search the front and back images carefully. The player name is printed on both sides. Identify it exactly (e.g., "Bronny James", "Victor Wembanyama", "Michael Jordan").
2. Brand/Manufacturer: Common card brands are "Panini", "Topps", "Upper Deck", "Bowman", "Fleer", "SkyBox". This is usually visible as a logo on the front or in copyright text on the back.
3. Model/Set: Identify the specific set name (e.g., "Prizm", "Donruss", "Optic", "Select", "Bowman Chrome", "Topps Chrome").
4. Card Number: Look on the back/rear of the card, usually in one of the corners or next to the stats table (e.g., "#12", "No. US15", "Card No. 24"). Return this value exactly including the '#' symbol if found, e.g., "#123".
5. Year: Look on the back/rear of the card in the tiny copyright/licensing text at the bottom. Identify the release/copyright year (e.g., 2023, 2019).
6. Title Format: You MUST format the Title as: [Year] [Brand/Manufacturer] [Model/Set] [Player Name] #[Card Number] (e.g., "2023 Panini Prizm Bronny James #15").
7. Manufacturer & Brand fields: Always set both brand and manufacturer to the brand/manufacturer name (e.g., "Panini") so the form maps it perfectly.
8. Corners, Edges, Surface, Centering: Provide detailed evaluations and pinpoint any flaws in 'defects' with precise percentage (x,y) coordinates relative to the image frame (0-100).

### CRITICAL RULES FOR SNEAKERS:
1. Tag & Label Inspection: Carefully scan any size tags (usually located inside the tongue of the shoe, side lining, or underneath the insole) or barcode box labels.
2. Style Code: Locate the unique style/art alphanumeric code (e.g., "DZ5485-612", "CP9654", "BB550WT1"). This is the single most important identifier for shoes. 
3. Size: Extract the US size (e.g., "10.5", "11", "9") from the size tag inside the shoe or the box label.
4. Brand & Model: Identify the Brand (e.g., "Nike", "Adidas", "Jordan", "Yeezy", "New Balance") and Model (e.g., "Air Jordan 1 High OG", "Yeezy Boost 350 V2", "Dunk Low").
5. Colorway: Determine the exact name of the colorway (e.g., "Chicago Lost and Found", "Zebra", "Panda", "Bred").
6. Title Format: You MUST format the Title as: [Brand] [Model] [Colorway] (e.g., "Jordan 1 Retro High OG Chicago Lost and Found").

### FORM FIELDS TO POPULATE:
- title: High-quality SEO Title.
- description: 1-2 lines detailing the item, key attributes, and its visual condition.
- price: Market estimate in AUD (number only, no characters).
- category: EXACTLY one of: 'Sneakers', 'Streetwear', 'Accessories', 'Collector Cards'. MUST match these exact strings.
- subCategory: e.g., 'Basketball Cards', 'Rookies' (Cards) or 'Jordan', 'Nike' (Sneakers) or 'Australian Coins' (Coins).
- condition: EXACTLY one of: 'New', 'Used', 'Mint', 'Near Mint', 'Excellent', 'Good', 'Fair'.
- brand: The main brand/manufacturer/mint (e.g., 'Panini', 'Nike', 'Perth Mint').
- model: Set name or model name (e.g., 'Prizm', 'Air Jordan 1').
- styleCode: Alphanumeric style code for sneakers.
- colorway: Sneaker colorway name.
- size: US sneaker size or card size.
- year: Release/mint year as a number.
- gradingCompany: e.g., 'PSA', 'BGS', 'SGC', 'Raw'.
- grade: e.g., '10', 'MS65', 'Near Mint'.
- certNumber: Graded barcode cert number (e.g., '48159263').
- cardNumber: For trading cards: e.g., '#15'.
- manufacturer: e.g., 'Panini', etc.
- suggestedFields: List of fields successfully extracted (e.g., ["title", "brand", "year", "certNumber", "category"]).
- alternatives: If there are multiple possible distinct matches (e.g., similar parallels or variants) and the exact identity is ambiguous, populate this array with up to 3 alternative options, including their title, brand, model, year, and cardNumber.
`
});
