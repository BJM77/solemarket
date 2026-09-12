'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DeepScanProOutputSchema = z.object({
  title: z.string().describe('The name/title of the product/collectible.'),
  price: z.number().nullable().optional().describe('The estimated retail or resale market price in AUD, if discernible.'),
  description: z.string().optional().describe('A detailed and engaging product listing description highlighting the item details, history, and specifications.'),
  condition: z.string().optional().describe('Condition estimate if discernible (e.g., Brand New, Like New, Excellent, Good, Used).'),
  category: z.string().optional().describe('The recommended category for the product (default: "Other Stuff").'),
  brand: z.string().optional().describe('The brand or manufacturer (e.g. LEGO, Apple, Funko, Supreme).'),
  model: z.string().optional().describe('The specific model or product line name.'),
  year: z.number().nullable().optional().describe('The release/manufacturing year of the item if visible or known.'),
});

export type DeepScanProOutput = z.infer<typeof DeepScanProOutputSchema>;

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

export async function deepScanPro(
  mainImageUrlOrBase64: string,
  secondaryImageUrlOrBase64: string,
): Promise<DeepScanProOutput> {
  console.log('[AI] deepScanPro called');
  
  try {
    const mainUrl = await prepareMediaUrl(mainImageUrlOrBase64);
    const secondaryUrl = await prepareMediaUrl(secondaryImageUrlOrBase64);

    const result = await ai.generate({
      model: 'googleai/gemini-flash-latest',
      prompt: [
        { text: `You are an expert product evaluator and marketplace listing assistant. Analyze these two images (Main View and Detail/Secondary View) of a product/collectible. Extract:
- title: A clean, descriptive title/name of the product
- price: An estimated retail or resale market price in AUD (if not discernible, leave blank or estimate)
- description: An engaging 2-3 sentence marketplace listing description highlighting its features
- condition: The estimated condition (e.g. New, Used) based on visual wear
- category: The category (always default to "Other Stuff")
- brand: The brand or manufacturer (if any)
- model: The model or line (if any)
- year: The release year (if visible or known)` },
        { media: { url: mainUrl } },
        { media: { url: secondaryUrl } }
      ],
      output: {
        schema: DeepScanProOutputSchema
      }
    });

    if (!result.output) {
      throw new Error("No structured output returned from Gemini.");
    }

    return result.output;
  } catch (error: any) {
    console.error("[AI] Error in deepScanPro:", error);
    throw new Error(`AI Product Scan Failed: ${error.message}`);
  }
}
