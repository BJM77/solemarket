'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { runAIWorkflow } from '../workflow-engine';

const QuickScanInputSchema = z.object({
    cardImageDataUri: z
        .string()
        .describe(
            "A photo of a trading card, as a data URI."
        ),
    idToken: z.string().optional().describe('Firebase ID Token for auth'),
    userId: z.string().optional().describe('User ID legacy tracking'),
});
type QuickScanInput = z.infer<typeof QuickScanInputSchema>;

const QuickScanOutputSchema = z.object({
    playerName: z.string().describe('The name of the player extracted from the card image.'),
});
export type QuickScanOutput = z.infer<typeof QuickScanOutputSchema>;

export async function quickScan(input: QuickScanInput): Promise<any> {
    return await runAIWorkflow<QuickScanOutput>(
        input,
        async (validatedInput) => {
            const { output } = await prompt(validatedInput);
            if (!output?.playerName) throw new Error("Gemini could not detect a player name.");
            return output;
        },
        {
            feature: 'quick-card-scan',
            usageType: 'vision_analysis',
            maxRetries: 2,
            requireAuth: !!input.idToken // Only require auth if token provided, otherwise system
        }
    );
}

const prompt = ai.definePrompt({
    name: 'quickScanPrompt',
    model: 'googleai/gemini-flash-latest',
    input: { schema: QuickScanInputSchema },
    output: { schema: QuickScanOutputSchema },
    prompt: `You are an expert at Optical Character Recognition on trading cards. Your ONLY job is to extract the player's full name from the provided card image. Return ONLY the name.
 
Card Image: {{media url=cardImageDataUri}}`,
});
