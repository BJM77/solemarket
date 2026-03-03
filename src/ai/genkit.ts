
/**
 * @fileoverview This file initializes the Genkit AI instance with the Google AI plugin.
 * It configures the connection to the Google Generative AI API using the provided API key.
 * The exported 'ai' object is used throughout the application to define and run AI flows.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const plugins = [];
const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (apiKey) {
  plugins.push(googleAI({ apiKey: apiKey }));
} else {
  console.warn(
    'GEMINI_API_KEY or GOOGLE_API_KEY environment variable is not set. AI features will be disabled.'
  );
}

export const ai = (() => {
  try {
    return genkit({
      plugins,
    });
  } catch (error) {
    console.error('❌ CRITICAL: Failed to initialize Genkit AI:', error);

    // Return a Proxy as fallback to prevent any method call from crashing the app
    const fallback: any = new Proxy(() => {
      throw new Error('AI is disabled due to initialization failure.');
    }, {
      get: (target, prop) => {
        if (prop === 'defineFlow') {
          return (cfg: any, fn: any) => {
            console.warn(`AI disabled: defineFlow ignored for ${cfg.name}`);
            return Object.assign(fn || (() => { }), { run: () => { throw new Error('AI disabled'); } });
          };
        }
        if (prop === 'definePrompt' || prop === 'defineTool') {
          return () => () => { throw new Error('AI disabled'); };
        }
        return () => { throw new Error(`AI disabled: ${String(prop)} is unavailable.`); };
      }
    });

    return fallback as unknown as ReturnType<typeof genkit>;
  }
})();
