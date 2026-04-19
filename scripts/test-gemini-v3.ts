
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const apiKey = process.env.GOOGLE_GENAI_API_KEY;
if (!apiKey) {
  console.error("No API key found in .env.local");
  process.exit(1);
}

const ai = genkit({
  plugins: [googleAI({ apiKey })],
});

async function testGemini() {
  const models = [
    'googleai/gemini-flash-latest', 
    'googleai/gemini-2.0-flash-lite',
    'googleai/gemini-1.5-flash-latest' // Try this one too just in case
  ];
  for (const model of models) {
    try {
      console.log(`\nTesting Gemini API with model: ${model}...`);
      const response = await ai.generate({
        model: model as any,
        prompt: 'Say hello! Just one word.',
      });
      console.log(`Response from ${model}:`, response.text);
    } catch (error) {
       if (error.code === 404) {
          console.log(`${model} not found (404)`);
       } else if (error.code === 429) {
          console.log(`${model} quota exceeded (429)`);
       } else {
          console.error(`Error for ${model}:`, error.message || error);
       }
    }
  }
}

testGemini();
