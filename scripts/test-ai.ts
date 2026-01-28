
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

const ai = genkit({
    plugins: [googleAI({ apiKey: apiKey })],
});

async function testAI() {
    const models = [
        'googleai/gemini-flash-latest',
        'googleai/gemini-2.0-flash',
        'googleai/gemini-1.5-flash-002',
        'googleai/gemini-1.5-flash'
    ];

    for (const model of models) {
        console.log(`\nTrying model: ${model}`);
        try {
            const result = await ai.generate({
                prompt: 'Say "Hello"',
                model: model as any,
            });
            console.log(`✅ Success with ${model}!`);
            break;
        } catch (error: any) {
            console.error(`❌ Failed with ${model}:`, error.originalMessage || error.message);
        }
    }
}

testAI();
