'use server';

import { ai } from '@/ai/genkit';
import { cardConditionInputSchema, cardConditionOutputSchema, type CardConditionInput, type CardConditionOutput } from './schemas';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { logAIUsage } from '@/services/ai-usage';

/**
 * Assesses the condition of a collector card based on its images.
 * @param input An object containing data URIs for the front and back images of the card.
 * @returns {Promise<CardConditionOutput>} A promise that resolves to a detailed condition report.
 */
export async function checkCardCondition(input: CardConditionInput): Promise<CardConditionOutput> {
    const result = await cardConditionFlow(input);

    // Log Usage
    const decodedToken = await verifyIdToken(input.idToken);
    await logAIUsage('Quick Card Scan', 'vision_analysis', decodedToken.uid);

    return result;
}

const cardConditionPrompt = ai.definePrompt({
    name: 'cardConditionPrompt',
    model: 'googleai/gemini-flash-latest',
    input: { schema: cardConditionInputSchema },
    output: { schema: cardConditionOutputSchema },
    prompt: `You are a professional trading card grader with expertise from a leading company like PSA or BGS.
    Analyze the front and back images of this trading card. Your analysis must be critical and adhere to professional grading standards.

    Images:
    - Front: {{media url=frontImageUri}}
    - Back: {{media url=backImageUri}}

    Your task is to provide a detailed condition report based ONLY on the provided images.
    1.  **Overall Grade:** Provide a single, definitive grade on a 1-10 scale, including the descriptive title (e.g., "Mint 9", "Near Mint 7", "Poor 1"). Be strict. If there's any doubt, grade down.
    2.  **Corners:** Assess all four corners on both front and back. Note any whitening, fraying, or rounding. Be specific (e.g., "Sharp corners with minor whitening visible on the back-left corner.").
    3.  **Edges:** Examine all edges for chips, whitening, or roughness. Be specific (e.g., "Mostly clean edges with one minor chip on the top edge.").
    4.  **Surface:** Look for scratches, print lines, dimples, or stains. Mention their location and severity.
    5.  **Centering:** Estimate the centering for both the front and back as a ratio (e.g., "60/40 Left-to-Right on the front").
    6.  **Image Quality:** Determine if the provided images are clear and high-resolution enough for a confident assessment. If they are blurry, poorly lit, or have glare, set 'isImageQualitySufficient' to false and provide specific feedback on how to improve the photos. Do not try to guess if the images are bad. If quality is good, this feedback should be empty.

    Do not invent details not visible in the images. Your assessment must be objective and based purely on visual evidence.
    `,
});

const cardConditionFlow = ai.defineFlow(
    {
        name: 'cardConditionFlow',
        inputSchema: cardConditionInputSchema,
        outputSchema: cardConditionOutputSchema,
    },
    async (input) => {
        const { output } = await cardConditionPrompt(input);
        if (!output) {
            throw new Error('Failed to get a response from the AI model.');
        }
        return output;
    }
);
