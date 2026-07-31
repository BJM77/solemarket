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
  description: z.string().optional().describe('A rich, engaging description of the coin commemorating its significance for a marketplace listing.'),
  price: z.number().optional().describe('Estimated market value in AUD as a number (e.g. 15, 150).'),
  condition: z.string().optional().describe('The strike condition / grade (e.g. "New", "Brilliant Uncirculated", "Proof", "Circulated").'),
  subCategory: z.string().optional().describe('The sub-category (e.g. "Australian Coins", "World Coins", "Error Coins").'),
  brand: z.string().optional().describe('The minting authority or brand (e.g. "Royal Australian Mint", "Perth Mint", "US Mint").'),
  model: z.string().optional().describe('The model or denomination of the coin (e.g. "$2", "$1", "50c").'),
  isMultiCoin: z.boolean().optional().describe('True if the image contains multiple coins, a coin set, coin roll, or lot.'),
  coinCount: z.number().optional().describe('Estimated count of coins in the image.'),
});

export type DeepScanCoinOutput = z.infer<typeof DeepScanCoinOutputSchema>;

async function prepareMediaUrl(urlOrBase64: string): Promise<string> {
  if (urlOrBase64.startsWith('data:')) {
    return urlOrBase64;
  }
  const response = await fetch(urlOrBase64);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64Data = buffer.toString('base64');
  const mimeType = response.headers.get('content-type') || 'image/jpeg';
  return `data:${mimeType};base64,${base64Data}`;
}

export async function deepScanCoin(
  imageUrlOrBase64: string,
  backImageUrlOrBase64?: string,
): Promise<DeepScanCoinOutput> {
  console.log('[AI] deepScanCoin called');
  
  try {
    const frontUrl = await prepareMediaUrl(imageUrlOrBase64);
    const mediaArray: any[] = [{ media: { url: frontUrl } }];

    if (backImageUrlOrBase64) {
      const backUrl = await prepareMediaUrl(backImageUrlOrBase64);
      mediaArray.push({ media: { url: backUrl } });
    }

    const promptText = `You are a professional coin grading and numismatic expert. Analyze the provided image(s) (Front/Obverse and optional Back/Reverse) of the coin and extract details for the output schema:
- coinName: The name or commemorative theme of the coin (required)
- setName: The series or set name (e.g. Australian Nugget Series)
- denomination: The face value or denomination (e.g. $1, 50c, Penny)
- country: The issuing country (e.g. Australia, USA, Great Britain)
- year: The mint year printed on the coin as a number. Inspect BOTH sides carefully. If no year is visible, return null
- mintMark: The mint mark (e.g. S, D, P, CC) if visible
- composition: The metal composition (Gold, Silver, Bronze, etc.)
- rarity: Rarity/strike type notes (e.g. Proof, Specimen, Low Mintage)
- isRare: Boolean, true if the coin is considered rare or highly collectible
- description: A rich, engaging paragraph describing the coin and its historical/collectible context for a marketplace listing.
- price: Estimate the market value of the coin in AUD as a number (e.g. 5, 15, 150).
- condition: The strike condition / grade (e.g. "New", "Brilliant Uncirculated", "Proof", "Circulated").
- subCategory: The sub-category (e.g. "Australian Coins", "World Coins", "Error Coins", "Proof Sets").
- brand: The minting authority or brand (e.g. "Royal Australian Mint", "Perth Mint", "US Mint"). Set to "Royal Australian Mint" if it is an Australian coin.
- model: The model or denomination of the coin (e.g. "$2", "$1", "50c").
- isMultiCoin: Boolean, set to true if the image contains multiple coins, a coin set, a coin roll, or a multi-coin presentation lot.
- coinCount: Number of coins visible in the image (1 for single coin, >1 for sets/rolls/lots). If multiple coins are present, title coinName as a set or lot.`;

    const result = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      prompt: [
        { text: promptText },
        ...mediaArray
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
