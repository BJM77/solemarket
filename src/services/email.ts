import sgMail from '@sendgrid/mail';
import { firestoreDb } from '@/lib/firebase/admin';

if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface SendEmailParams {
    to: string | string[];
    from?: string;
    subject: string;
    text?: string;
    html: string;
    replyTo?: string;
}

export async function sendEmail({
    to,
    from = 'Benched <onboarding@benched.au>', // Default sender
    subject,
    text,
    html,
    replyTo
}: SendEmailParams) {
    const logData: any = {
        to: Array.isArray(to) ? to : [to],
        from,
        subject,
        timestamp: new Date(),
        status: 'pending'
    };

    if (!process.env.SENDGRID_API_KEY) {
        console.warn('[EMAIL SERVICE] SENDGRID_API_KEY is missing. Email not sent:', { to, subject });
        await firestoreDb.collection('email_logs').add({
            ...logData,
            status: 'dev_skipped',
            message: 'Dev mode: API Key missing'
        });
        return { success: true, message: 'Dev mode: Email logged to console' };
    }

    try {
        const msg = {
            to,
            from,
            subject,
            text,
            html,
            replyTo,
        };

        await sgMail.send(msg);
        
        // Log success to Firestore
        await firestoreDb.collection('email_logs').add({
            ...logData,
            status: 'sent'
        });

        return { success: true };
    } catch (error: any) {
        console.error('[EMAIL SERVICE] SendGrid Error:', error);
        
        // Log failure to Firestore
        await firestoreDb.collection('email_logs').add({
            ...logData,
            status: 'failed',
            error: error.message || 'Unknown error',
            details: error.response?.body || null
        });

        if (error.response) {
            console.error(error.response.body);
        }
        return { success: false, error: error.message || 'Failed to send email' };
    }
}
