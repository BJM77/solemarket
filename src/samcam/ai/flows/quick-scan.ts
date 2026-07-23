'use server';

import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';

const QuickScanOutputSchema = z.object({
  playerName: z.string().optional().describe('The name of the player extracted from the card image.'),
  team: z.string().optional().describe('The team the player plays for.'),
  cardBrand: z.string().optional().describe('The brand or manufacturer of the card.'),
  isCard: z.boolean().optional().default(true).describe('Whether the image contains a recognizable sports/trading card.')
});

export type QuickScanOutput = z.infer<typeof QuickScanOutputSchema>;

export async function quickScan(
  imageDataUri: string
): Promise<QuickScanOutput> {
  console.log('[AI] quickScan called');

  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error('[AI] GOOGLE_API_KEY is not set');
      throw new Error("GOOGLE_API_KEY environment variable is not set.");
    }

    console.log('[AI] Initializing Google Generative AI');
    const genAI = new GoogleGenerativeAI(apiKey);

    // Use gemini-2.5-flash which supports vision
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 300,
      },
    });

    // Extract base64 data
    const base64Data = imageDataUri.split(',')[1];
    const mimeType = imageDataUri.match(/data:(.*);base64/)?.[1] || 'image/jpeg';

    console.log('[AI] Image info for quick scan:', { mimeType, dataLength: base64Data?.length });

    const prompt = `Analyze this image. Is it a sports card or trading card?
1. If NO (it's a person, object, blurred mess, etc.), return: {"isCard": false}
2. If YES, extract the player's full name, team, and card brand. Return: {"isCard": true, "playerName": "Name", "team": "Team", "cardBrand": "Brand"}

Example Match: {"isCard": true, "playerName": "Michael Jordan", "team": "Chicago Bulls", "cardBrand": "Fleer"}
Example No Match: {"isCard": false}

IMPORTANT: Return ONLY the JSON object.`;

    console.log('[AI] Sending quick scan request');

    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text().trim();

    console.log('[AI] Quick scan raw response:', text);

    // Parse JSON from response
    let jsonText = text;

    // Clean up the response
    if (jsonText.includes('```json')) {
      jsonText = jsonText.split('```json')[1].split('```')[0].trim();
    } else if (jsonText.includes('```')) {
      jsonText = jsonText.split('```')[1].split('```')[0].trim();
    }

    // Extract JSON if it's wrapped in other text
    const jsonMatch = jsonText.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    } else {
      // Fallback: if text is short and looks like a name, wrap it
      if (!jsonText.includes('{') && jsonText.length < 50) {
        console.warn('[AI] Response not JSON, attempting fallback wrap:', jsonText);
        jsonText = JSON.stringify({ playerName: jsonText });
      }
    }

    console.log('[AI] Parsed quick scan JSON:', jsonText);

    const parsed = JSON.parse(jsonText);
    const validated = QuickScanOutputSchema.parse(parsed);

    console.log('[AI] Quick scan validated:', validated);
    return validated;

  } catch (error: any) {
    console.error("[AI] Quick Scan error:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });

    // Check for specific API key errors
    if (error.message?.includes('API key not valid') || error.message?.includes('400')) {
      throw new Error("The configured Google API key is invalid.");
    }

    throw error;
  }
}
