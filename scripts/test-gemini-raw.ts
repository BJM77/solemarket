
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import * as dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config({ path: '.env.local' });

const apiKey = process.env.GOOGLE_GENAI_API_KEY;
if (!apiKey) {
  console.error("No API key found in .env.local");
  process.exit(1);
}

async function listModels() {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const result = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("Gemini 1.5 Flash initialized successfully.");
    
    // Test a basic generation with the raw SDK
    const genResult = await result.generateContent("Say hello!");
    console.log("Raw SDK Response:", genResult.response.text());

    // Check version and available models if possible
    // Note: getGenerativeModel doesn't provide a list, let's use a dynamic approach
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listModels();
