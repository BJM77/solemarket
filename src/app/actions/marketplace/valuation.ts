'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { runAIWorkflow } from '@/ai/workflow-engine';

const ValuationSchema = z.object({
    currentMarketValue: z.number().describe("Estimated current market value in AUD."),
    confidenceScore: z.number().min(1).max(10).describe("Confidence in this valuation based on data quality."),
    marketTrend: z.enum(['up', 'stable', 'down']).describe("Projected price trend over the next 3-6 months."),
    recommendation: z.enum(['buy', 'hold', 'sell']).describe("Investment recommendation."),
    reasoning: z.string().describe("Brief justification for the valuation and recommendation."),
    comparableSales: z.array(z.object({
        source: z.string(),
        price: z.number(),
        date: z.string()
    })).optional()
});

export type ValuationResult = z.infer<typeof ValuationSchema>;

/**
 * AI-powered Predictive Valuation Engine.
 * Analyzes a product and potential historical data to provide investment advice.
 */
export async function getPredictiveValuation(idToken: string, productData: any, historicalSales: any[] = []) {
    return await runAIWorkflow<ValuationResult>(
        { idToken, productData, historicalSales },
        async (validatedInput) => {
            const prompt = `You are a financial analyst specializing in alternative assets (Sneakers and Trading Cards).
Analyze the following item and historical data to provide a market valuation and investment recommendation.

ITEM DETAILS:
${JSON.stringify(validatedInput.productData, null, 2)}

HISTORICAL SALES DATA:
${JSON.stringify(validatedInput.historicalSales, null, 2)}

Provide a detailed valuation including:
1. Current Market Value in AUD.
2. Confidence Score (1-10).
3. Market Trend (up/stable/down).
4. Recommendation (buy/hold/sell).
5. Reasoning (2-3 sentences).
`;

            const { output } = await ai.generate({
                model: 'googleai/gemini-2.0-flash',
                prompt,
                output: { schema: ValuationSchema }
            });

            if (!output) throw new Error("Valuation engine failed to return data.");
            return output;
        },
        {
            feature: 'predictive-valuation',
            usageType: 'text_generation',
            maxRetries: 2
        }
    );
}
