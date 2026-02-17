'use server';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendContactEmail(formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const subject = formData.get('subject') as string;
    const message = formData.get('message') as string;

    if (!name || !email || !message) {
        return { success: false, error: 'Name, email, and message are required.' };
    }

    try {
        if (!process.env.RESEND_API_KEY) {
            console.warn('RESEND_API_KEY is missing. pseudo-success for dev.');
            return { success: true };
        }

        await resend.emails.send({
            from: 'Benched Contact <onboarding@resend.dev>', // Update this if you have a verified domain
            to: ['ben@benched.au'], // Send to the admin
            replyTo: email, // Direct reply to user
            subject: `[Benched Contact] ${subject || 'New Message'}`,
            text: `
              Name: ${name}
              Email: ${email}
              Subject: ${subject}
              
              Message:
              ${message}
          `,
        });

        return { success: true };
    } catch (error: any) {
        console.error('Contact email error:', error);
        return { success: false, error: 'Failed to send message. Please try again or email us directly.' };
    }
}
