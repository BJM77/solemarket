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
});

export type DeepScanCardOutput = z.infer<typeof DeepScanCardOutputSchema>;

export async function deepScanCard(
  imageUrlOrBase64: string,
): Promise<DeepScanCardOutput> {
  console.log('[AI] deepScanCard called');
  
  try {
    let mimeType = 'image/jpeg';
    let mediaUrl = imageUrlOrBase64;

    if (!imageUrlOrBase64.startsWith('data:')) {
      const response = await fetch(imageUrlOrBase64);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString('base64');
      mimeType = response.headers.get('content-type') || 'image/jpeg';
      mediaUrl = `data:${mimeType};base64,${base64Data}`;
    }

    const result = await ai.generate({
      model: 'googleai/gemini-flash-latest',
      prompt: [
        { text: `You are a trading card expert. Analyze this card image and extract the details for the output schema.
- cardName: The name of the player or Pokemon (required)
- setName: The name of the set the card belongs to
- cardNumber: The card number (e.g. 150/150, #24)
- sport: The category (e.g. Pokemon, Basketball, Football, Baseball, Soccer)
- year: The year printed on the card as a number. If no year is visible, return null
- pokemonCode: If Pokemon, the set code (e.g. SV4a) if visible
- rarity: If Pokemon/TCG, the rarity or stars (e.g. Rare, Secret Rare, **)
- isRare: Boolean, true if this card is considered rare or a chase card
- description: A small engaging sentence or paragraph describing the card for a listing.` },
        { media: { url: mediaUrl } }
      ],
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
