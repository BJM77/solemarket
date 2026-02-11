'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ProfileInputSchema = z.object({
    category: z.string(),
    subject: z.string(), // e.g., "Michael Jordan" or "Pokemon Base Set"
});

const ProfileOutputSchema = z.object({
    title: z.string(),
    investmentOutlook: z.string(),
    rarityAnalysis: z.string(),
    topKeyAttributes: z.array(z.string()),
    seoMetaDescription: z.string(),
});

/**
 * Generates an "Encyclopedia" Investment Profile for a collector subject.
 */
export async function generateInvestmentProfile(category: string, subject: string) {
    try {
        const prompt = `You are a high-end collectibles investment analyst. Generate a detailed investment profile for the following subject:
    
    Category: ${category}
    Subject: ${subject}
    
    Generate:
    1. A catchy SEO title.
    2. An "Investment Outlook" (approx 100 words) discussing value trends.
    3. A "Rarity Analysis" explaining why this is desirable.
    4. A list of 3-5 "Key Attributes" collectors should look for.
    5. A compelling 160-character meta description.
    
    Tone: Authoritative, professional, and data-driven.`;

        const result = await ai.generate({
            model: 'googleai/gemini-flash-latest',
            prompt: [{ text: prompt }],
            output: { schema: ProfileOutputSchema }
        });

        return result.output;
    } catch (error) {
        console.error('Error generating Investment Profile:', error);
        return null;
    }
}
