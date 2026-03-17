import sgMail from '@sendgrid/mail';

/**
 * SendGrid Email Service for Benched.au
 */

const API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'no-reply@benched.au';

if (API_KEY) {
    sgMail.setApiKey(API_KEY);
}

interface EnquiryEmailParams {
    to: string;
    sellerName: string;
    productTitle: string;
    price: string;
    pendingLink: string;
    relistLink: string;
}

export async function sendSellerEnquiryEmail({
    to,
    sellerName,
    productTitle,
    price,
    pendingLink,
    relistLink
}: EnquiryEmailParams) {
    if (!API_KEY) {
        console.warn('⚠️ SendGrid API Key not configured. Email skipped.');
        return;
    }

    const msg = {
        to,
        from: {
            email: FROM_EMAIL,
            name: 'Benched.au Alerts'
        },
        subject: `🔥 High Intent: Someone wants to Buy & Collect your ${productTitle}`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 20px;">
                <h1 style="color: #111; font-size: 24px; font-weight: 900; margin-bottom: 10px;">New 'Buy & Collect' Alert</h1>
                <p style="color: #666; font-size: 16px; line-height: 1.5;">Hi ${sellerName},</p>
                <p style="color: #666; font-size: 16px; line-height: 1.5;">A buyer is very interested in your <strong>${productTitle}</strong> ($${price}) and has requested your contact details for local collection.</p>
                
                <div style="background: #f9f9f9; padding: 20px; border-radius: 15px; margin: 25px 0; text-align: center;">
                    <p style="font-weight: bold; margin-bottom: 15px; color: #111;">Manage this listing instantly:</p>
                    
                    <a href="${pendingLink}" style="display: inline-block; background: #111; color: white; text-decoration: none; padding: 12px 25px; border-radius: 10px; font-weight: bold; margin: 5px;">Mark as Pending</a>
                    
                    <a href="${relistLink}" style="display: inline-block; background: #fff; color: #111; border: 2px solid #eee; text-decoration: none; padding: 12px 25px; border-radius: 10px; font-weight: bold; margin: 5px;">Not Sold / Relist</a>
                </div>

                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                    <strong>What is Pending?</strong> Marking as pending hides your phone number from other buyers while you finalize the deal. 
                    <br><br>
                    Stay safe! Always meet in a public place.
                </p>
            </div>
        `,
    };

    try {
        await sgMail.send(msg);
        console.log(`✅ Professional enquiry email sent to ${to}`);
    } catch (error: any) {
        console.error('❌ SendGrid Error:', error.response?.body || error.message);
    }
}

/**
 * Sends a verification code to a user for email/identity verification.
 */
export async function sendVerificationEmail(to: string, displayName: string, code: string) {
    if (!API_KEY) {
        console.warn('⚠️ SendGrid API Key not configured. Verification email skipped.');
        return { success: false, error: 'Email service not configured' };
    }

    const msg = {
        to,
        from: {
            email: FROM_EMAIL,
            name: 'Benched.au'
        },
        subject: `${code} is your Benched verification code`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #fff; border-radius: 24px; border: 1px solid #f0f0f0;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #111; font-size: 28px; font-weight: 900; margin: 0; letter-spacing: -0.5px;">Verify your identity</h1>
                    <p style="color: #666; font-size: 16px; margin-top: 10px;">Hi ${displayName}, use the code below to complete your verification.</p>
                </div>
                
                <div style="background: #f8f9fa; padding: 40px; border-radius: 20px; text-align: center; margin: 30px 0;">
                    <div style="font-family: monospace; font-size: 42px; font-weight: 900; color: #111; letter-spacing: 10px; margin-bottom: 10px;">${code}</div>
                    <p style="color: #999; font-size: 12px; font-weight: bold; text-transform: uppercase; tracking: 1px;">Security Code</p>
                </div>

                <div style="color: #666; font-size: 14px; line-height: 1.6; text-align: center;">
                    <p>This code will expire in 10 minutes. If you didn't request this code, you can safely ignore this email.</p>
                </div>

                <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #f0f0f0; text-align: center;">
                    <p style="color: #999; font-size: 12px;">© 2026 Benched.au · Secured Peer-to-Peer Marketplace</p>
                </div>
            </div>
        `,
    };

    try {
        await sgMail.send(msg);
        console.log(`✅ Verification email sent to ${to}`);
        return { success: true };
    } catch (error: any) {
        console.error('❌ SendGrid Error:', error.response?.body || error.message);
        return { success: false, error: error.message };
    }
}

export async function sendReviewNudgeEmail({
    to,
    buyerName,
    productTitle,
    reviewLink
}: {
    to: string;
    buyerName: string;
    productTitle: string;
    reviewLink: string;
}) {
    if (!API_KEY) return;
    const msg = {
        to,
        from: { email: FROM_EMAIL, name: 'Benched.au' },
        subject: `How was your experience with the ${productTitle}?`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 24px;">
                <h1 style="color: #111; font-size: 22px; font-weight: 900;">Nice pick up!</h1>
                <p style="color: #666; font-size: 16px;">Hi ${buyerName}, congrats on your new <strong>${productTitle}</strong>.</p>
                <p style="color: #666; font-size: 16px;">Since you both met up offline, our community relies on your feedback to keep things safe. Could you spare 30 seconds to leave a review for the seller?</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${reviewLink}" style="display: inline-block; background: #111; color: white; text-decoration: none; padding: 15px 30px; border-radius: 12px; font-weight: bold;">Leave a Review</a>
                </div>

                <p style="color: #999; font-size: 12px;">Your feedback helps others trade with confidence.</p>
            </div>
        `,
    };
    try {
        await sgMail.send(msg);
        console.log(`✅ Review nudge sent to ${to}`);
    } catch (e) {
        console.error('Review nudge failed:', e);
    }
}

export async function sendSellerGhostNudgeEmail({
    to,
    sellerName,
    productTitle,
    dashboardLink
}: {
    to: string;
    sellerName: string;
    productTitle: string;
    dashboardLink: string;
}) {
    if (!API_KEY) return;
    const msg = {
        to,
        from: { email: FROM_EMAIL, name: 'Benched.au' },
        subject: `Still available? Quick update for your ${productTitle}`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 24px;">
                <h1 style="color: #111; font-size: 22px; font-weight: 900;">Marketplace Clean-up</h1>
                <p style="color: #666; font-size: 16px;">Hi ${sellerName}, your listing for <strong>${productTitle}</strong> has been marked as 'Pending' for a few days.</p>
                <p style="color: #666; font-size: 16px;">If you've sold it, please mark it as sold to stop getting enquiries. If it's still available, make sure to relist it so buyers can see it again!</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${dashboardLink}" style="display: inline-block; background: #111; color: white; text-decoration: none; padding: 15px 30px; border-radius: 12px; font-weight: bold;">Manage Listing</a>
                </div>

                <p style="color: #999; font-size: 12px;">Keeping your status updated helps the community find what they need.</p>
            </div>
        `,
    };
    try {
        await sgMail.send(msg);
        console.log(`✅ Ghost nudge sent to ${to}`);
    } catch (e) {
        console.error('Ghost nudge failed:', e);
    }
}
