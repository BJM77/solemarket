'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { runAIWorkflow } from '@/ai/workflow-engine';

const PricingRecommendationSchema = z.object({
    recommendedPrice: z.number().describe("The recommended fair market value in AUD."),
    confidence: z.enum(['High', 'Medium', 'Low']).describe("Confidence level based on the provided product details."),
    reasoning: z.string().describe("A brief 1-2 sentence explanation for why this price was chosen.")
});

export type PricingRecommendation = z.infer<typeof PricingRecommendationSchema>;

/**
 * AI Server Action to evaluate a single product and recommend a price.
 */
export async function getAIRecommendedPrice(idToken: string, productData: any) {
    return await runAIWorkflow<PricingRecommendation>(
        { idToken, productData },
        async (validatedInput) => {
            const prompt = `You are an expert appraiser for an Australian marketplace specializing in sneakers, collector cards, and coins.
Please analyze the following product details and provide a recommended fair market price in AUD.

PRODUCT DETAILS:
Title: ${validatedInput.productData.title}
Description: ${validatedInput.productData.description}
Category: ${validatedInput.productData.category}
Sub-Category: ${validatedInput.productData.subCategory || 'N/A'}
Condition: ${validatedInput.productData.condition || 'N/A'}
Current Listed Price: $${validatedInput.productData.price}

If the product is a card or coin, take note of any grading (e.g. PSA 10). If it's a sneaker, consider the brand, model, and general market hype.
Provide a realistic, competitive market value in AUD. 

CRITICAL: The recommendedPrice MUST be a single numeric value (e.g. 15.50). Do NOT use strings, currency symbols, or ranges.`;

            const { output } = await ai.generate({
                model: 'googleai/gemini-2.0-flash',
                prompt,
                output: { schema: PricingRecommendationSchema }
            });

            if (!output) throw new Error("AI failed to return a pricing recommendation.");
            return output;
        },
        {
            feature: 'admin-ai-pricing',
            usageType: 'text_generation',
            maxRetries: 2
        }
    );
}
