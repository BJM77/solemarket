'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { gradeCardDetailsSchema, type GradeCardDetailsOutput } from '@/ai/schemas/grading-schemas';
import { runAIWorkflow } from '../workflow-engine';

export type { GradeCardDetailsOutput };

/**
 * Advanced Card Grading AI Flow (Gemini 2.0 Enhanced)
 * Analyzes front and back of a card for:
 * - Corners (wear, damage, sharpness)
 * - Centering (left/right, top/bottom balance)
 * - Edges (whitening, chipping, wear)
 * - Surface (scratches, print lines, creases)
 * - Damage Detection (Specific flaws)
 */

const gradeCardDetailsPrompt = ai.definePrompt({
    name: 'gradeCardDetailsPrompt',
    model: 'googleai/gemini-2.0-flash',
    input: {
        schema: z.object({
            frontImage: z.string(),
            backImage: z.string().optional(),
            cardName: z.string().optional()
        })
    },
    output: { schema: gradeCardDetailsSchema },
    prompt: `You are a world-class professional trading card grader (e.g., PSA/BGS senior grader).
Your goal is to provide a surgical, high-integrity assessment of the provided card.

{{#if cardName}}
Card Name: {{cardName}}
{{/if}}

Front Image: {{media url=frontImage}}
{{#if backImage}}Back Image: {{media url=backImage}}{{/if}}

**PHASE 1: VISUAL SCAN**
Thoroughly scan the edges, every corner, and the entire surface for:
- **Whitening**: Especially on the back edges and corners.
- **Surface Scratches**: Look for light refractions indicating surface wear.
- **Soft Corners**: Any rounding or loss of sharpness.
- **Centering**: Estimate the L/R and T/B ratios for both front and back.
- **Creases/Dents**: Any structural damage to the card stock.

**PHASE 2: DAMAGE DETECTION**
For every flaw you find, populate the **detectedIssues** array with the type, exact location, severity, and a brief description. BE HONEST.

**PHASE 3: SCORING**
Score each sub-category (Corners, Centering, Edges, Surface) from 1-10 based on standard industry scales. 
- 10: Gem Mint
- 9: Mint
- 8: Near Mint-Mint
- 7: Near Mint
- 6: Excellent-Mint
- 5: Excellent
- 4: Very Good
- 3: Good
- 2: Fair
- 1: Poor

Provide a final overall grade. If only a front image is provided, your back analysis must be marked as 'estimate only' in the notes.
`,
});

export async function gradeCardDetails(input: {
    frontImage: string; // URL or Data URI
    backImage?: string; // URL or Data URI
    cardName?: string;
    idToken?: string;
}): Promise<any> {
    return await runAIWorkflow<GradeCardDetailsOutput>(
        input,
        async (validatedInput) => {
            const { output } = await gradeCardDetailsPrompt({
                frontImage: validatedInput.frontImage,
                backImage: validatedInput.backImage,
                cardName: validatedInput.cardName,
            });

            if (!output) throw new Error("AI failed to generate grading details");
            return output;
        },
        {
            feature: 'advanced-card-grading',
            usageType: 'grading',
            maxRetries: 2
        }
    );
}
