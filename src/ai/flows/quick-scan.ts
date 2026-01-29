'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { logAIUsage } from '@/services/ai-usage';

const QuickScanInputSchema = z.object({
    cardImageDataUri: z
        .string()
        .describe(
            "A photo of a trading card, as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
        ),
    userId: z.string().optional().describe('User ID for logging'),
});
type QuickScanInput = z.infer<typeof QuickScanInputSchema>;

const QuickScanOutputSchema = z.object({
    playerName: z
        .string()
        .describe('The name of the player extracted from the card image.'),
});
export type QuickScanOutput = z.infer<typeof QuickScanOutputSchema>;

export async function quickScan(
    input: QuickScanInput
): Promise<QuickScanOutput> {
    const result = await quickScanFlow(input);

    // Log Usage
    await logAIUsage('Quick Card Scan', 'vision_analysis', input.userId);

    return result;
}

const prompt = ai.definePrompt({
    name: 'quickScanPrompt',
    model: 'googleai/gemini-flash-latest',
    input: { schema: QuickScanInputSchema },
    output: { schema: QuickScanOutputSchema },
    prompt: `You are an expert at Optical Character Recognition on trading cards. Your ONLY job is to extract the player's full name from the provided card image. Return ONLY the name.

Card Image: {{media url=cardImageDataUri}}`,
});

const quickScanFlow = ai.defineFlow(
    {
        name: 'quickScanFlow',
        inputSchema: QuickScanInputSchema,
        outputSchema: QuickScanOutputSchema,
    },
    async (input) => {
        if (!input.cardImageDataUri.startsWith('data:image/')) {
            throw new Error('Invalid image format. Use JPEG or PNG.');
        }
        const { output } = await prompt(input);
        if (!output?.playerName) {
            throw new Error("Gemini could not detect a player name.");
        }
        return output;
    }
);
