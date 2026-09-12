
'use server';

/**
 * @fileOverview A simple flow to test if the GenAI API key is working.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { verifyIdToken } from '@/lib/firebase/auth-admin';

const testApiKeyOutputSchema = z.object({
  status: z.string(),
  message: z.string(),
  modelInfo: z.any().optional(),
});

export async function testApiKey(idToken: string): Promise<z.infer<typeof testApiKeyOutputSchema>> {
  const decodedToken = await verifyIdToken(idToken);
  const userRole = decodedToken.role;

  if (userRole !== 'admin' && userRole !== 'superadmin') {
    throw new Error('You do not have permission to perform this action.');
  }
  return await testApiKeyFlow();
}

const testApiKeyFlow = ai.defineFlow(
  {
    name: 'testApiKeyFlow',
    outputSchema: testApiKeyOutputSchema,
  },
  async () => {
    try {
      const result = await ai.generate({
        prompt: 'Give me a one-sentence fun fact about collectible trading cards.',
        model: 'googleai/gemini-flash-latest',
        output: {
          schema: z.object({
            fact: z.string(),
          }),
        },
      });

      const modelInfo = result.usage;

      return {
        status: 'Success',
        message: result.output?.fact || 'Successfully connected to the AI service.',
        modelInfo: modelInfo,
      };
    } catch (error: any) {
      console.error('API Key Test Error:', error);
      let errorMessage = 'An unknown error occurred.';
      if (error.message.includes('API key not valid')) {
        errorMessage = 'The provided API key is not valid. Please check your .env.local file.';
      } else if (error.message.includes('fetch')) {
        errorMessage = 'A network error occurred. Could not connect to the AI service.';
      } else {
        errorMessage = error.message;
      }

      return {
        status: 'Error',
        message: errorMessage,
      };
    }
  }
);
