'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DeepScanCoinOutputSchema = z.object({
  coinName: z.string().describe('The name of the coin or commemorative theme (e.g. Lunar Year Dragon, Kangaroo, Queen Elizabeth II).'),
  setName: z.string().optional().describe('The series or set name if applicable (e.g. Australian Nuggets, Sovereign).'),
  denomination: z.string().optional().describe('The denomination or face value (e.g. $1, 50c, Penny, Sovereign).'),
  country: z.string().optional().describe('The country of origin / issue (e.g. Australia, USA, United Kingdom).'),
  year: z.number().nullable().optional().describe('The year of minting printed on the coin, if visible.'),
  mintMark: z.string().optional().describe('The mint mark if visible (e.g. S, D, P, CC).'),
  composition: z.string().optional().describe('The metal composition if discernable (e.g. Silver, Gold, Copper).'),
  rarity: z.string().optional().describe('The rarity or collector notes (e.g. Proof, Low Mintage).'),
  isRare: z.boolean().optional().describe('Whether this coin is considered highly rare or a premium collector item.'),
  description: z.string().optional().describe('A small engaging description of the coin for a marketplace listing.'),
});

export type DeepScanCoinOutput = z.infer<typeof DeepScanCoinOutputSchema>;

export async function deepScanCoin(
  imageUrlOrBase64: string,
): Promise<DeepScanCoinOutput> {
  console.log('[AI] deepScanCoin called');
  
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
        { text: `You are a professional coin grading and numismatic expert. Analyze this coin image and extract details for the output schema.
- coinName: The name or commemorative theme of the coin (required)
- setName: The series or set name (e.g. Australian Nugget Series)
- denomination: The face value or denomination (e.g. $1, 50c, Penny)
- country: The issuing country (e.g. Australia, USA, Great Britain)
- year: The mint year printed on the coin as a number. If no year is visible, return null
- mintMark: The mint mark (e.g. S, D, P, CC) if visible
- composition: The metal composition (Gold, Silver, Bronze, etc.)
- rarity: Rarity/strike type notes (e.g. Proof, Specimen, Low Mintage)
- isRare: Boolean, true if the coin is considered rare or highly collectible
- description: A short, engaging sentence or paragraph describing the coin for a listing.` },
        { media: { url: mediaUrl } }
      ],
      output: {
        schema: DeepScanCoinOutputSchema
      }
    });

    if (!result.output) {
      throw new Error("No structured output returned from Gemini.");
    }

    return result.output;
  } catch (error: any) {
    console.error("[AI] Error in deepScanCoin:", error);
    throw new Error(`AI Coin Scan Failed: ${error.message}`);
  }
}
