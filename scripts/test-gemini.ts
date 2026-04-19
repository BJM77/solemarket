
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
  try {
    console.log("Testing Gemini API with model: gemini-1.5-flash...");
    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt: 'Say hello!',
    });
    console.log("Response:", response.text);
    
    console.log("\nTesting Gemini API with model: gemini-flash-latest...");
    const responseLatest = await ai.generate({
      model: 'googleai/gemini-flash-latest',
      prompt: 'Say hello!',
    });
    console.log("Response Latest:", responseLatest.text);
  } catch (error) {
    console.error("Error during Gemini test:", error);
  }
}

testGemini();
