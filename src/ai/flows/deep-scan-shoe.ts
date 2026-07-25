'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DeepScanShoeOutputSchema = z.object({
  brand: z.string().describe('The brand of the shoe (e.g. Nike, Jordan, Adidas, New Balance, Asics).'),
  model: z.string().describe('The specific model name of the shoe (e.g. Air Jordan 1 Retro High, Yeezy Boost 350 V2).'),
  styleCode: z.string().describe('The product style code / SKU (e.g. 555088-061, BB550WT1, GY3438) found on the label.'),
  sizeUs: z.string().describe('The US size of the shoe (e.g. 10.5, 9, 12W) printed on the label.'),
  colorway: z.string().optional().describe('The official colorway name (e.g. Bred, Wave Runner, Panda, UNC) or description.'),
  condition: z.string().optional().describe('Condition estimate if discernible, otherwise standard description.'),
  price: z.number().nullable().optional().describe('The estimated retail or resale market price in USD, if discernible.'),
  description: z.string().optional().describe('A detailed and engaging product listing description highlighting the sneaker design, history, and specifications.'),
});

export type DeepScanShoeOutput = z.infer<typeof DeepScanShoeOutputSchema>;

export async function deepScanShoe(
  imageUrlOrBase64: string,
): Promise<DeepScanShoeOutput> {
  console.log('[AI] deepScanShoe called');
  
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
        { text: `You are a professional sneaker authenticator and sneakerhead expert. Analyze this sneaker label/tag image and extract the product details.
- brand: The brand (e.g. Nike, Jordan, Adidas, New Balance, Yeezy)
- model: The model name (e.g. Air Jordan 1 Retro High, Yeezy Boost 350 V2)
- styleCode: The product SKU / style code printed on the label (e.g., 555088-061, BB550WT1)
- sizeUs: The US shoe size printed on the label
- colorway: The colorway if discernible
- price: An estimated resale/retail market price in USD for this model
- description: Write an engaging 2-3 sentence marketplace description for this shoe.` },
        { media: { url: mediaUrl } }
      ],
      output: {
        schema: DeepScanShoeOutputSchema
      }
    });

    if (!result.output) {
      throw new Error("No structured output returned from Gemini.");
    }

    return result.output;
  } catch (error: any) {
    console.error("[AI] Error in deepScanShoe:", error);
    throw new Error(`AI Shoe Scan Failed: ${error.message}`);
  }
}
