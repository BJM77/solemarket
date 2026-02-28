'use server'

import { firestoreDb } from '@/lib/firebase/admin';
import { Resend } from 'resend';

// Configure Resend using API Key from environment variables.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Generates a verification code and sends it to the user's email.
 * This is used specifically for confirming bids/offers.
 */
export async function sendActionVerificationEmail(email: string) {
    if (!resend) {
        console.warn('RESEND_API_KEY is not set. Skipping email sending.');
        return { success: false, error: 'Email service not configured.' };
    }

    // Generate a 5-digit code for simplicity
    const code = Math.floor(10000 + Math.random() * 90000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    try {
        // Store the code in Firestore with the email as the document ID in 'action_verifications' collection.
        await firestoreDb.collection('action_verifications').doc(email).set({
            code,
            expires,
            used: false,
            createdAt: new Date(),
        });

        // Send the email using the Resend service.
        const { error } = await resend.emails.send({
            from: 'Benched Verification <onboarding@resend.dev>', // In production, replace this with a verified domain
            to: email,
            subject: `Action Required: ${code} is your code`,
            html: `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; color: #1a202c; background-color: #ffffff;">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #F26A21; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">BENCHED</h1>
                    <p style="color: #718096; font-size: 14px; margin-top: 5px;">MARKETPLACE VERIFICATION</p>
                  </div>
                  
                  <h2 style="color: #1a202c; font-size: 20px; font-weight: 700; text-align: center; margin-bottom: 20px;">Confirm Your Offer</h2>
                  
                  <p style="font-size: 16px; line-height: 1.6; text-align: center; color: #4a5568;">
                    You're about to place a binding offer or bid. Please use the verification code below to confirm this action:
                  </p>
                  
                  <div style="background: #f7fafc; padding: 40px; text-align: center; border-radius: 12px; margin: 30px 0; border: 2px dashed #cbd5e0;">
                    <span style="font-size: 48px; font-weight: 900; letter-spacing: 12px; color: #1a202c; font-family: monospace;">${code}</span>
                  </div>
                  
                  <div style="background: #fffaf0; padding: 15px; border-left: 4px solid #F26A21; border-radius: 4px; margin-bottom: 30px;">
                    <p style="font-size: 13px; color: #744210; margin: 0;"><strong>Security Note:</strong> This code is valid for 10 minutes. <strong>Never</strong> share this code with anyone, including Benched staff.</p>
                  </div>
                  
                  <p style="font-size: 14px; color: #718096; text-align: center;">If you did not attempt to place an offer, please delete this email immediately and secure your account.</p>
                  
                  <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 30px 0;" />
                  
                  <p style="font-size: 12px; color: #a0aec0; text-align: center;">&copy; ${new Date().getFullYear()} Benched Australia. All rights reserved.</p>
                </div>
            `,
        });

        if (error) {
            console.error('Resend Error:', error);
            return { success: false, error: 'Failed to send verification email. Please try again later.' };
        }

        return { success: true };
    } catch (err: any) {
        console.error('Error in sendActionVerificationEmail:', err);
        return { success: false, error: 'Internal server error.' };
    }
}

/**
 * Checks a verification code against the stored code for the specified email.
 */
export async function verifyActionCode(email: string, userCode: string) {
    try {
        const docRef = firestoreDb.collection('action_verifications').doc(email);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return { success: false, error: 'No verification code found. Please request a new one.' };
        }

        const data = docSnap.data();
        if (!data) return { success: false, error: 'Invalid verification data.' };

        if (data.used) {
            return { success: false, error: 'This code has already been used. Please request a new one.' };
        }

        // Check if the current time is beyond the expiration timestamp.
        if (new Date() > data.expires.toDate()) {
            return { success: false, error: 'Verification code expired. Please request a new one.' };
        }

        if (data.code !== userCode) {
            return { success: false, error: 'Incorrect code. Please try again.' };
        }

        // Mark the code as used so it cannot be reused.
        await docRef.update({ used: true });

        return { success: true };
    } catch (err: any) {
        console.error('Error in verifyActionCode:', err);
        return { success: false, error: 'Verification failed.' };
    }
}
