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
