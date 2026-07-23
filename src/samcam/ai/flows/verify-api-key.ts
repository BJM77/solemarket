
'use server';

import { z } from 'zod';

const VerifyApiKeyOutputSchema = z.object({
  isValid: z.boolean().describe('Whether the API key is valid.'),
  error: z.string().optional().describe('The error message if verification failed.'),
});
export type VerifyApiKeyOutput = z.infer<typeof VerifyApiKeyOutputSchema>;

export async function verifyApiKey(): Promise<VerifyApiKeyOutput> {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        return { isValid: false, error: "GOOGLE_API_KEY environment variable is not set." };
    }
    
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
              parts: [{ text: "test" }],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = errorData.error.message || 'An unknown error occurred.';
        if (errorMessage.includes('API_KEY_SERVICE_BLOCKED') || errorMessage.includes('permission denied')) {
            errorMessage = 'The API key is valid, but the Generative Language API service is not enabled for your project.';
        } else if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('API key not valid')) {
            errorMessage = 'The provided API key is invalid. Please check and try again.';
        }
        return { isValid: false, error: errorMessage };
    }

    return { isValid: true };
  } catch (e: any) {
    console.error('API Key verification failed:', e);
    return { isValid: false, error: e.message || 'An unknown error occurred during verification.' };
  }
}
