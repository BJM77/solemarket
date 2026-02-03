'use server';

import { firestoreDb as db } from '@/lib/firebase/admin';
import { revalidatePath } from 'next/cache';
import { Product } from '@/lib/types';

interface GuestEnquiryInput {
    sellerId: string;
    productId: string;
    productTitle: string;
    name: string;
    email: string;
    message: string;
}

export async function sendGuestEnquiry(data: GuestEnquiryInput) {
    try {
        // Validate
        if (!data.email || !data.message || !data.name) {
            return { success: false, error: 'Missing required fields' };
        }

        const enquiryData = {
            ...data,
            type: 'guest_enquiry',
            status: 'unread',
            createdAt: new Date().toISOString(),
        };

        // Save to 'notifications' or specialized 'enquiries' collection
        // For now, let's use 'conversations' but mark it specially, OR usage 'notifications' for seller
        // Actually, creating a 'conversations' doc allows it to appear in the seller's inbox is best,
        // but 'conversations' expects participantIds which implies UIDs.
        // If we can't create a real conversation, we'll create a 'guest_enquiries' collection
        // and send a notification to the seller.

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
