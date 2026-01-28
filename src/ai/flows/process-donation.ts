
'use server';

/**
 * @fileOverview A flow to process donations, send a confirmation, and generate a shipping label.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { processDonationInputSchema, processDonationOutputSchema } from './schemas';
import { verifyIdToken } from '@/lib/firebase/auth-admin';

export async function processDonation(input: z.infer<typeof processDonationInputSchema>) {
    const validatedInput = processDonationInputSchema.parse(input);
    await verifyIdToken(validatedInput.idToken);
    return await processDonationFlow(validatedInput);
}

// Dummy tool for "sending an email"
const sendConfirmationEmailTool = ai.defineTool(
    {
        name: 'sendConfirmationEmail',
        description: 'Sends a confirmation email to the donor with a shipping label.',
        inputSchema: z.object({
            email: z.string(),
            fullName: z.string(),
            shippingLabelUrl: z.string().url(),
        }),
        outputSchema: z.object({ success: z.boolean() }),
    },
    async (input) => {
        console.log(`INFO: [Simulated Email] Sent to ${input.email} for ${input.fullName} with label ${input.shippingLabelUrl}`);
        // In a real app, this would integrate with an email service like SendGrid or Resend.
        return { success: true };
    }
);

const processDonationFlow = ai.defineFlow(
    {
        name: 'processDonationFlow',
        inputSchema: processDonationInputSchema,
        outputSchema: processDonationOutputSchema,
    },
    async (input) => {
        const fakeShippingLabel = 'https://example.com/shipping-label/fake-label-12345.pdf';

        const result = await ai.generate({
            prompt: `The user ${input.fullName} (${input.email}) is donating ${input.quantity} of ${input.donationType}. Their description is: "${input.description}". Please generate a brief, friendly thank you message and then call the email tool to send them the shipping label.`,
            model: 'googleai/gemini-flash-latest',
            tools: [sendConfirmationEmailTool],
            output: {
                schema: z.object({
                    thankYouMessage: z.string().describe('A short, friendly thank you message for the user.'),
                }),
            },
        });

        const toolCalls = result.toolRequests;
        if (toolCalls.length === 0) {
            throw new Error("The model did not request to send the confirmation email.");
        }

        // You can optionally inspect tool calls before executing
        // For now, we just execute what the model requested.
        const toolOutputs = await Promise.all(toolCalls.map(async tc => ({ tool: tc, output: await tc.run() })));

        // You could pass the tool outputs back to the model for a final response,
        // but for this flow, we'll just confirm it was called.
        const emailSent = toolOutputs.some(output => (output.output as any)?.success === true);

        if (emailSent) {
            return {
                status: "Success",
                message: result.output?.thankYouMessage || `Thank you, ${input.fullName}! Your shipping label has been sent to ${input.email}.`,
            };
        } else {
            throw new Error("Failed to execute the send email tool.");
        }
    }
);
