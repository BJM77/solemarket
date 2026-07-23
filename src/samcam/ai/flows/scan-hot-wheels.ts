
'use server';

import {z} from 'zod';

const ScanHotWheelsInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A photo of a Hot Wheels car, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
type ScanHotWheelsInput = z.infer<typeof ScanHotWheelsInputSchema>;

const ScanHotWheelsOutputSchema = z.object({
  carName: z
    .string()
    .describe('The name of the Hot Wheels car model identified from the image.'),
  year: z
    .number()
    .optional()
    .describe('The production year of the car, if visible on the car or packaging.'),
});
export type ScanHotWheelsOutput = z.infer<typeof ScanHotWheelsOutputSchema>;

export async function scanHotWheels(
  input: ScanHotWheelsInput
): Promise<ScanHotWheelsOutput> {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error("GOOGLE_API_KEY environment variable is not set.");
    }
    
    const base64Data = input.imageDataUri.split(',')[1];
    const mimeType = input.imageDataUri.match(/data:(.*);base64/)?.[1] || 'image/jpeg';
    
    const prompt = `You are a Hot Wheels expert. Your job is to identify the car in the image.
1.  Identify the car's model name.
2.  Identify the year of the car, if visible on the car or its packaging.
Return ONLY a valid JSON object with the keys "carName" and "year".

Example response: {"carName": "Bone Shaker", "year": 2009}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI did not return a valid JSON object for the Hot Wheels car.");
    }
    text = jsonMatch[0];

    const parsed = JSON.parse(text);
    return ScanHotWheelsOutputSchema.parse(parsed);

  } catch (error: any) {
    console.error("Hot Wheels Scan error:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
    });
    if (error.message.includes('API key not valid')) {
        throw new Error("The Gemini API key is invalid.");
    }
    throw new Error(`AI Scan Failed: ${error.message}`);
  }
}
