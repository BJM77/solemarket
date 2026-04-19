
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

const apiKey = process.env.GOOGLE_GENAI_API_KEY;
if (!apiKey) {
  console.error("No API key found in .env.local");
  process.exit(1);
}

async function listAllModels() {
  const versions = ['v1', 'v1beta'];
  for (const v of versions) {
    console.log(`\nChecking models for version ${v}...`);
    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/${v}/models?key=${apiKey}`);
      const data = await resp.json();
      if (data.models) {
        console.log(`Models found for ${v}:`, data.models.map(m => m.name));
      } else {
        console.log(`No models found for ${v}:`, data);
      }
    } catch (error) {
      console.error(`Error for ${v}:`, error);
    }
  }
}

listAllModels();
