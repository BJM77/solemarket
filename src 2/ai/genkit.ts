
/**
 * @fileoverview This file initializes the Genkit AI instance with the Google AI plugin.
 * It configures the connection to the Google Generative AI API using the provided API key.
 * The exported 'ai' object is used throughout the application to define and run AI flows.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = (() => {
  try {
    const plugins: any[] = [];
    const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (apiKey) {
      plugins.push(googleAI({ apiKey }));
    } else {
      console.warn('⚠️ No AI API key found. AI features will be disabled at runtime.');
    }

    const instance = genkit({
      plugins,
    });
    (instance as any).isReady = true;
    return instance as unknown as ReturnType<typeof genkit> & { isReady: boolean };
  } catch (error) {
    console.error('❌ CRITICAL: Failed to initialize Genkit AI:', error);

    // Static fallback instead of Proxy for maximum stability and compatibility
    return {
      isReady: false,
      defineFlow: (cfg: any, fn: any) => {
        console.warn(`AI disabled: defineFlow ignored for ${cfg?.name || 'unknown'}`);
        const dummyFlow: any = fn || (() => { throw new Error('AI disabled'); });
        dummyFlow.run = () => { throw new Error('AI disabled'); };
        return dummyFlow;
      },
      definePrompt: () => () => { throw new Error('AI disabled'); },
      defineTool: () => () => { throw new Error('AI disabled'); },
      generate: () => { throw new Error('AI disabled'); },
      run: () => { throw new Error('AI disabled'); }
    } as unknown as ReturnType<typeof genkit> & { isReady: boolean };
  }
})();

export const isAIReady = (ai as any).isReady !== false;
