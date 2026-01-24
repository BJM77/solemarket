'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { verifyIdToken } from '@/lib/firebase/auth-admin';

const ModerateContentInputSchema = z.object({
    productName: z.string().describe('The name of the product.'),
    productDescription: z.string().describe('The description of the product.'),
    productImageUri: z
        .string()
        .optional()
        .describe(
            'A photo of the product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
        ),
    idToken: z.string().describe('The Firebase ID token of the user.'),
});
export type ModerateContentInput = z.infer<typeof ModerateContentInputSchema>;

const ModerateContentOutputSchema = z.object({
    isCompliant: z
        .boolean()
        .describe(
            'Whether the product content complies with the platform policies.'
        ),
    policyViolations: z
        .array(z.string())
        .describe('A list of policy violations identified in the product content.'),
    isFakeOrMalicious: z
        .boolean()
        .describe('Whether the product is suspected to be fake or malicious.'),
    confidenceScore: z
        .number()
        .describe(
            'A score indicating the confidence level of the moderation decision (0-1).'
        ),
    explanation: z
        .string()
        .describe(
            'A detailed explanation of the moderation decision, including reasons for policy violations or suspicion of fake/malicious activity.'
        ),
});
export type ModerateContentOutput = z.infer<typeof ModerateContentOutputSchema>;

export async function moderateContent(
    input: ModerateContentInput
): Promise<ModerateContentOutput> {
    await verifyIdToken(input.idToken);
    return moderateContentFlow(input);
}

const moderateContentPrompt = ai.definePrompt({
    name: 'moderateContentPrompt',
    input: { schema: ModerateContentInputSchema },
    output: { schema: ModerateContentOutputSchema },
    prompt: `You are an AI-powered content moderation tool for an e-commerce platform.
Your task is to review product content and identify any policy violations, fake products, or malicious content.

Here are the platform policies:
- No hate speech or discrimination.
- No illegal or harmful products.
- No misleading or deceptive content.
- No copyright infringement.
- All products must be accurately described.
- Product images must be relevant and appropriate.

Analyze the following product content:

Product Name: {{{productName}}}
Product Description: {{{productDescription}}}
{{#if productImageUri}}
Product Image: {{media url=productImageUri}}
{{else}}
(No image provided)
{{/if}}

Based on the content and platform policies, determine if the product is compliant, identify any policy violations, and assess whether the product is fake or malicious.

Provide a confidence score (0-1) for your decision and a detailed explanation.

Output in JSON format.`,
});

const moderateContentFlow = ai.defineFlow(
    {
        name: 'moderateContentFlow',
        inputSchema: ModerateContentInputSchema,
        outputSchema: ModerateContentOutputSchema,
    },
    async input => {
        const { output } = await moderateContentPrompt(input);
        return output!;
    }
);
