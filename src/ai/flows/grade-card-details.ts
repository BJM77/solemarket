import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { gradeCardDetailsSchema, type GradeCardDetailsOutput } from '@/ai/schemas/grading-schemas';
import { verifyIdToken } from '@/lib/firebase/auth-admin';

export type { GradeCardDetailsOutput };

/**
 * Advanced Card Grading AI Flow
 * Analyzes front and back of a card for:
 * - Corners (wear, damage, sharpness)
 * - Centering (left/right, top/bottom balance)
 * - Edges (whitening, chipping, wear)
 * - Surface (scratches, print lines, creases)
 */

const gradeCardDetailsPrompt = ai.definePrompt({
    name: 'gradeCardDetailsPrompt',
    model: 'googleai/gemini-1.5-flash-latest',
    input: { 
        schema: z.object({
            frontImage: z.string(), 
            backImage: z.string().optional(), 
            cardName: z.string().optional()
        }) 
    },
    output: { schema: gradeCardDetailsSchema },
    prompt: `You are an expert trading card grader with deep knowledge of PSA, BGS, and CGC grading standards.

Analyze the provided card image(s) and provide a detailed grading assessment.

{{#if cardName}}
Card Name: {{cardName}}
{{/if}}

Front Image: {{media url=frontImage}}

{{#if backImage}}
Back Image: {{media url=backImage}}
{{/if}}

**GRADING CRITERIA:**

**Corners (1-10):**
- 10: Perfect sharp corners, no wear
- 8-9: Very slight wear visible under magnification
- 6-7: Minor corner wear visible
- 4-5: Moderate corner rounding or wear
- 1-3: Heavy corner wear, rounding, or damage

**Centering (1-10):**
- 10: Perfect 50/50 centering on all sides
- 9: 55/45 or better
- 8: 60/40 or better
- 7: 65/35 or better
- 6: 70/30 or better
- 5 or less: Worse than 70/30

**Edges (1-10):**
- 10: Perfect clean edges, no whitening
- 8-9: Very slight edge wear
- 6-7: Minor edge whitening or wear
- 4-5: Moderate edge issues
- 1-3: Significant edge damage, chipping, or whitening

**Surface (1-10):**
- 10: Perfect surface, no flaws
- 8-9: One or two very minor surface issues
- 6-7: Minor scratches or print lines
- 4-5: Multiple surface issues
- 1-3: Significant surface damage, creases

**OVERALL GRADE SCALE:**
- 10 (Gem Mint): Perfect card
- 9 (Mint): Near perfect, one tiny flaw
- 8 (Near Mint/Mint): Excellent condition, very minor flaws
- 7 (Near Mint): Minor flaws
- 6 (Excellent/Mint): Some wear, still presentable
- 5 (Excellent): Noticeable wear but no major damage
- 4 (Very Good): Moderate wear, starting to show age
- 3 (Good): Significant wear
- 2 (Fair): Heavy wear, major flaws
- 1 (Poor): Extensive damage

Analyze the card thoroughly and provide specific details about each grading aspect.
If only front image is provided, note that back analysis is estimate only.

Return your analysis in the structured format requested.
`,
});

export async function gradeCardDetails(input: {
    frontImageDataUri: string;
    backImageDataUri?: string;
    cardName?: string;
    idToken?: string;
}): Promise<GradeCardDetailsOutput> {
    if (!input.idToken) {
        throw new Error('Authentication required: No ID token provided.');
    }
    await verifyIdToken(input.idToken);

    const { output } = await gradeCardDetailsPrompt({
        frontImage: input.frontImageDataUri,
        backImage: input.backImageDataUri,
        cardName: input.cardName,
    });
    
    if (!output) {
        throw new Error("Failed to generate grading details");
    }

    return output;
}
