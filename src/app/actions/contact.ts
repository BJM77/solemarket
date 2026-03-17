'use server';

import { sendEmail } from '@/services/email';

export async function sendContactEmail(formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const subject = formData.get('subject') as string;
    const message = formData.get('message') as string;

    if (!name || !email || !message) {
        return { success: false, error: 'Name, email, and message are required.' };
    }

    try {
        const result = await sendEmail({
            from: 'Benched Contact <onboarding@benched.au>', // Update this if you have a verified domain
            to: 'ben@benched.au', // Send to the admin
            replyTo: email, // Direct reply to user
            subject: `[Benched Contact] ${subject || 'New Message'}`,
            text: `
              Name: ${name}
              Email: ${email}
              Subject: ${subject}
              
              Message:
              ${message}
            `,
            html: `
              <div style="font-family: sans-serif; padding: 20px;">
                <h2>New Contact Message</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <hr/>
                <p><strong>Message:</strong></p>
                <p style="white-space: pre-wrap;">${message}</p>
              </div>
            `
        });

        if (!result.success) {
            return { success: false, error: result.error || 'Failed to send message.' };
        }

        return { success: true };
    } catch (error: any) {
        console.error('Contact email error:', error);
        return { success: false, error: 'Failed to send message. Please try again or email us directly.' };
    }
}
