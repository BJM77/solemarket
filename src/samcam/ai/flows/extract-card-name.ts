'use server';

import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { DeviceProfile } from '../../lib/device-detector';

const ExtractCardNameOutputSchema = z.object({
  playerName: z.string().describe('The name of the player extracted from the card image.'),
  cardBrand: z.string().optional().describe('The brand of the trading card, if visible (e.g., Panini, Topps).'),
  cardColor: z.string().optional().describe('The primary color of the card, if discernible.'),
  sport: z.string().optional().describe('The sport associated with the card (e.g., Basketball, Football, Baseball).'),
  cardYear: z.number().nullable().optional().describe('The year printed on the card, if visible.'),
});

export type ExtractCardNameOutput = z.infer<typeof ExtractCardNameOutputSchema>;

export async function extractCardName(
  imageDataUri: string,
  deviceProfile?: DeviceProfile
): Promise<ExtractCardNameOutput> {
  console.log('[AI] extractCardName called');
  
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error('[AI] GOOGLE_API_KEY is not set');
      throw new Error("GOOGLE_API_KEY environment variable is not set.");
    }

    console.log('[AI] Initializing Google Generative AI');
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Choose model based on device characteristics
    let modelName = 'gemini-1.5-flash';
    if (deviceProfile?.isHighEnd) {
      modelName = 'gemini-1.5-pro';
    }

    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
      },
    });

    // Extract base64 data
    const base64Data = imageDataUri.split(',')[1];
    const mimeType = imageDataUri.match(/data:(.*);base64/)?.[1] || 'image/jpeg';
    
    console.log('[AI] Image info:', { mimeType, dataLength: base64Data?.length });

    const prompt = `You are a trading card expert. Analyze this sports card image and extract the following details. Return ONLY a valid JSON object with these keys:
- playerName: The full name of the player (required)
- cardBrand: The brand of the card (e.g., Panini, Topps, Prizm) if visible
- cardColor: The main color of the card if visible
- sport: The sport (e.g., Basketball, Football, Baseball, Hockey, Soccer)
- cardYear: The year printed on the card as a number. If no year is visible, return null

Example response: {"playerName": "Michael Jordan", "cardBrand": "Topps", "cardColor": "Red/Blue", "sport": "Basketball", "cardYear": 1986}

IMPORTANT: Return ONLY the JSON object, no other text.`;

    console.log('[AI] Sending request to Gemini');
    
    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text().trim();
    
    console.log('[AI] Raw response:', text);

    // Parse JSON from response
    let jsonText = text;
    
    // Clean up the response (remove markdown code blocks if present)
    if (jsonText.includes('```json')) {
      jsonText = jsonText.split('```json')[1].split('```')[0].trim();
    } else if (jsonText.includes('```')) {
      jsonText = jsonText.split('```')[1].split('```')[0].trim();
    }

    // Extract JSON if it's wrapped in other text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    console.log('[AI] Parsed JSON text:', jsonText);

    const parsed = JSON.parse(jsonText);
    const validated = ExtractCardNameOutputSchema.parse(parsed);
    
    console.log('[AI] Validated result:', validated);
    return validated;

  } catch (error: any) {
    console.error("[AI] Error in extractCardName:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
    
    // Check for specific API key errors
    if (error.message.includes('API key not valid') || 
        error.message.includes('API_KEY_INVALID') ||
        error.message.includes('400')) {
      throw new Error("The configured Google API key is invalid or has insufficient permissions.");
    }
    
    // Check for model errors
    if (error.message.includes('model') || error.message.includes('404')) {
      throw new Error("The AI model is not available. Please check the model name.");
    }
    
    throw new Error(`AI Scan Failed: ${error.message}`);
  }
}
