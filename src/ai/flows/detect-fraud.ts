'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { verifyIdToken } from '@/lib/firebase/auth-admin';

const DetectFraudInputSchema = z.object({
    details: z.string().describe('The transaction details or user messages to analyze.'),
    idToken: z.string().describe('The Firebase ID token of the user.'),
});
export type DetectFraudInput = z.infer<typeof DetectFraudInputSchema>;

const DetectFraudOutputSchema = z.object({
    isFraudulent: z
        .boolean()
        .describe('Whether the provided text is likely to be fraudulent.'),
    riskScore: z
        .number()
        .describe('A score from 0 to 1 indicating the level of fraud risk.'),
    reason: z
        .string()
        .describe('An explanation for why the transaction is or is not considered fraudulent.'),
    recommendedAction: z.string().optional().describe('A recommended action for the moderator (e.g., "Ban User", "Monitor User").')
});
export type DetectFraudOutput = z.infer<typeof DetectFraudOutputSchema>;

export async function detectFraud(
    input: DetectFraudInput
): Promise<DetectFraudOutput> {
    const decodedToken = await verifyIdToken(input.idToken);
    const userRole = decodedToken.role;

    if (userRole !== 'admin' && userRole !== 'superadmin') {
        throw new Error('You do not have permission to perform this action.');
    }

    return detectFraudFlow(input);
}

const prompt = ai.definePrompt({
    name: 'detectFraudPrompt',
    input: { schema: DetectFraudInputSchema },
    output: { schema: DetectFraudOutputSchema },
    prompt: `You are a fraud detection expert for an online marketplace. Analyze the following text and determine if it represents a fraudulent or suspicious transaction.

Details:
{{{details}}}

Based on the details, determine if it's fraudulent, provide a risk score (0-1), a reason for your assessment, and a recommended action.
Common fraud patterns include:
- Offering to pay outside the platform.
- Asking for personal information (email, phone number).
- Using strange grammar or urgent language.
- Offering a deal that is too good to be true.`,
});

const detectFraudFlow = ai.defineFlow(
    {
        name: 'detectFraudFlow',
        inputSchema: DetectFraudInputSchema,
        outputSchema: DetectFraudOutputSchema,
    },
    async input => {
        const { output } = await prompt(input);
        return output!;
    }
);
