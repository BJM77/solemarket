'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { verifyIdToken } from '@/lib/firebase/auth-admin';

const NotifySellerInputSchema = z.object({
    sellerEmail: z.string().email().describe('The email address of the seller to notify.'),
    sellerName: z.string().describe('The name of the seller.'),
    productName: z.string().describe('The name of the product that was removed.'),
    idToken: z.string().describe('The Firebase ID token of the user.'),
});
export type NotifySellerInput = z.infer<typeof NotifySellerInputSchema>;

const NotifySellerOutputSchema = z.object({
    success: z.boolean().describe('Whether the notification was sent successfully.'),
    message: z.string().describe('A summary of the action taken.'),
});
export type NotifySellerOutput = z.infer<typeof NotifySellerOutputSchema>;

export async function notifySellerOfRemoval(input: NotifySellerInput): Promise<NotifySellerOutput> {
    const decodedToken = await verifyIdToken(input.idToken);
    const userRole = decodedToken.role;

    if (userRole !== 'admin' && userRole !== 'superadmin') {
        throw new Error('You do not have permission to perform this action.');
    }
    return notifySellerOfRemovalFlow(input);
}

const prompt = ai.definePrompt({
    name: 'notifySellerPrompt',
    input: { schema: NotifySellerInputSchema },
    prompt: `Generate a professional and courteous email to a seller informing them that their product has been removed for violating the platform's terms and conditions.

Seller Name: {{{sellerName}}}
Product Name: {{{productName}}}
Seller Email: {{{sellerEmail}}}

The email should:
1. State clearly that the product "{{{productName}}}" has been removed.
2. Mention that the removal is due to a violation of the platform's Terms and Conditions.
3. Direct the seller to review the T&Cs for more information.
4. Be polite and professional in tone.`,
});

const notifySellerOfRemovalFlow = ai.defineFlow(
    {
        name: 'notifySellerOfRemovalFlow',
        inputSchema: NotifySellerInputSchema,
        outputSchema: NotifySellerOutputSchema,
    },
    async (input) => {
        const { text } = await prompt(input);

        console.log('--- SIMULATING EMAIL ---');
        console.log(`To: ${input.sellerEmail}`);
        console.log(`Subject: Important Notification Regarding Your Product: "${input.productName}"`);
        console.log('--- Email Body ---');
        console.log(text);
        console.log('------------------------');

        return {
            success: true,
            message: `Simulated an email notification to ${input.sellerEmail} regarding the removal of "${input.productName}".`,
        };
    }
);
