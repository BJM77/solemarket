'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DeepScanCardOutputSchema = z.object({
  cardName: z.string().describe('The name of the player or Pokemon extracted from the card image.'),
  setName: z.string().optional().describe('The name of the set the card belongs to.'),
  cardNumber: z.string().optional().describe('The card number (e.g., 150/150, #24, etc).'),
  sport: z.string().optional().describe('The category/sport (e.g., Pokemon, Basketball, Football, Baseball).'),
  year: z.number().nullable().optional().describe('The year printed on the card, if visible.'),
  pokemonCode: z.string().optional().describe('If it is a Pokemon card, the specific set code (e.g. SV4a) if visible.'),
  rarity: z.string().optional().describe('If it is a Pokemon or trading card, the rarity or stars (e.g., Rare, Secret Rare, **).'),
  isRare: z.boolean().optional().describe('Whether this card is considered rare or a collector item based on its attributes.'),
  description: z.string().optional().describe('A small sentence or paragraph describing the card.'),
  manufacturer: z.string().optional().describe('The manufacturer or brand of the card (e.g. Panini, Topps, Upper Deck, The Pokemon Company, Konami).'),
  subCategory: z.string().optional().describe('The sub-category (e.g. Sports Cards, Pokemon TCG, Yu-Gi-Oh, Magic: The Gathering, Football Cards).'),
  condition: z.string().optional().describe('Estimated condition of the card based on visible wear, centering, and edges (e.g. Mint, Near Mint, Lightly Played).'),
});

export type DeepScanCardOutput = z.infer<typeof DeepScanCardOutputSchema>;

const DEEP_SCAN_PROMPT = `You are an expert trading card appraiser and cataloger with deep knowledge of Pokemon, NBA, NFL, MLB, Soccer, and all major TCG franchises.

IMPORTANT INSTRUCTIONS:
1. Examine EVERY part of the card image(s) extremely carefully — front AND back if both are provided.
2. The card number is CRITICAL. Look for it in these common locations:
   - Bottom-left or bottom-right corner of the front (e.g. "101/140", "#24", "SV049")
   - The back of the card near the bottom or in a small box
   - Near the card name or in the card border
   - For Pokemon: look for the collector number (e.g. "025/198") at the bottom of the card face
3. The set name can often be found:
   - On the back of the card
   - As a logo or watermark on the front
   - In small text at the bottom or edges
   - For Pokemon: the set symbol/icon in the bottom-right corner
4. The year is often printed on the back of the card in copyright text (e.g. "© 2024 The Pokemon Company")
5. For manufacturer, look for logos or copyright text (Panini, Topps, Upper Deck, Konami, etc.)

Extract ALL of the following with maximum accuracy:
- cardName: The full name of the player, Pokemon, or character shown on the card (REQUIRED)
- setName: The complete set or expansion name (e.g. "Prismatic Evolutions", "Panini Prizm", "Topps Chrome")
- cardNumber: The card number exactly as printed (e.g. "150/150", "#24", "SV049", "PSA-10"). Look very carefully for this.
- sport: The category — Pokemon, Basketball, Football, Baseball, Soccer, Yu-Gi-Oh, Magic: The Gathering, etc.
- year: The year as a number. Check copyright text on the back if not on front. Return null only if truly not visible.
- pokemonCode: For Pokemon cards only — the set code like "SV4a", "sv7", "S12a", "BS" etc.
- rarity: The rarity level — Common, Uncommon, Rare, Holo Rare, Ultra Rare, Secret Rare, Illustration Rare, Special Art Rare, Hyper Rare, etc. Look for star symbols (★), diamond (◆), or circle (●) markers.
- isRare: true if the card has holo/foil/special treatment, is numbered, or has rarity markers beyond Common/Uncommon
- description: A compelling 1-3 sentence listing description highlighting the card's key visual features and collectibility
- manufacturer: The company that made the card (Panini, Topps, Upper Deck, The Pokemon Company, Konami, Bushiroad, etc.)
- subCategory: The specific sub-category (Sports Cards, Pokemon TCG, Yu-Gi-Oh TCG, NBA Cards, NFL Cards, etc.)
- condition: Your best estimate of card condition from the image (Mint, Near Mint, Lightly Played, Moderately Played, Damaged)

If you cannot determine a field with confidence, provide your best educated guess based on card design, era, and visual cues rather than leaving it empty.`;

async function imageToBase64(imageUrlOrBase64: string): Promise<{ mediaUrl: string }> {
  if (imageUrlOrBase64.startsWith('data:')) {
    return { mediaUrl: imageUrlOrBase64 };
  }

  const response = await fetch(imageUrlOrBase64);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64Data = buffer.toString('base64');
  const mimeType = response.headers.get('content-type') || 'image/jpeg';
  return { mediaUrl: `data:${mimeType};base64,${base64Data}` };
}

export async function deepScanCard(
  frontImageUrlOrBase64: string,
  backImageUrlOrBase64?: string,
): Promise<DeepScanCardOutput> {
  console.log('[AI] deepScanCard called', { hasBack: !!backImageUrlOrBase64 });
  
  try {
    const { mediaUrl: frontMediaUrl } = await imageToBase64(frontImageUrlOrBase64);
    
    // Build prompt parts — include both images when available
    const promptParts: any[] = [
      { text: DEEP_SCAN_PROMPT },
      { text: '\n\n--- FRONT OF CARD ---' },
      { media: { url: frontMediaUrl } },
    ];

    if (backImageUrlOrBase64) {
      const { mediaUrl: backMediaUrl } = await imageToBase64(backImageUrlOrBase64);
      promptParts.push(
        { text: '\n\n--- BACK OF CARD ---' },
        { media: { url: backMediaUrl } }
      );
    } else {
      promptParts.push({
        text: '\n\nNote: Only the front image is available. Extract as much data as possible from the front alone. Pay extra attention to any visible card number, set name, or year on the front face.'
      });
    }

    const result = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      prompt: promptParts,
      output: {
        schema: DeepScanCardOutputSchema
      }
    });

    if (!result.output) {
      throw new Error("No structured output returned from Gemini.");
    }

    return result.output;
  } catch (error: any) {
    console.error("[AI] Error in deepScanCard:", error);
    throw new Error(`AI Scan Failed: ${error.message}`);
  }
}
