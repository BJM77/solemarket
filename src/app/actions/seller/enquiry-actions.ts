'use server';
import { checkRateLimit } from '@/lib/rate-limit-guard';

import { firestoreDb as db } from '@/lib/firebase/admin';
import { revalidatePath } from 'next/cache';
import { Product } from '@/lib/types';
import { verifyActionCode } from '../auth/email-verification';

interface GuestEnquiryInput {
    sellerId: string;
    productId: string;
    productTitle: string;
    name: string;
    email: string;
    message: string;
    verificationCode: string;
}

export async function sendGuestEnquiry(data: GuestEnquiryInput) {
    if (!(await checkRateLimit('guest-enquiry', { limit: 5, windowSeconds: 600 }))) {
        return { success: false, message: 'Too many requests. Please wait a moment and try again.', error: 'Too many requests. Please wait a moment and try again.' } as any;
    }
    try {
        // Validate
        if (!data.email || !data.message || !data.name || !data.verificationCode) {
            return { success: false, error: 'Missing required fields' };
        }

        // Block generic "available" messages
        if (data.message.toLowerCase().includes('available')) {
            return { 
                success: false, 
                error: "Your message contains 'available'. Please customize your message to be more specific (e.g., asking about condition or pickup) to ensure the seller responds." 
            };
        }

        // Verify guest email before proceeding
        const verifyResult = await verifyActionCode(data.email, data.verificationCode);
        if (!verifyResult.success) {
            return { success: false, error: verifyResult.error || "Verification failed" };
        }

        const enquiryData = {
            sellerId: data.sellerId,
            productId: data.productId,
            productTitle: data.productTitle,
            name: data.name,
            email: data.email,
            message: data.message,
            type: 'guest_enquiry',
            status: 'unread',
            createdAt: new Date().toISOString(),
        };

        await db.collection('guest_enquiries').add(enquiryData);

        // Notify seller (internal notification)
        await db.collection('notifications').add({
            recipientId: data.sellerId,
            type: 'system',
            title: `New Guest Enquiry: ${data.productTitle}`,
            message: `${data.name} (${data.email}) asks: ${data.message.substring(0, 50)}...`,
            read: false,
            createdAt: new Date().toISOString(),
            link: `/dashboard/enquiries` // Hypothetical
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error sending guest enquiry:", error);
        return { success: false, error: error.message };
    }
}
