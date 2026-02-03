'use server';

import { firestoreDb as db } from '@/lib/firebase/admin';
import { revalidatePath } from 'next/cache';

interface ContactMessageInput {
    name: string;
    email: string;
    subject: string;
    message: string;
    userId?: string;
}

export async function submitContactMessage(data: ContactMessageInput) {
    try {
        // Validate input
        if (!data.name || data.name.trim().length < 2) {
            return { success: false, error: 'Name must be at least 2 characters' };
        }

        if (!data.email || !data.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            return { success: false, error: 'Please enter a valid email address' };
        }

        if (!data.subject || data.subject.trim().length < 3) {
            return { success: false, error: 'Subject must be at least 3 characters' };
        }

        if (!data.message || data.message.trim().length < 10) {
            return { success: false, error: 'Message must be at least 10 characters' };
        }

        // Create message document
        const messageData = {
            name: data.name.trim(),
            email: data.email.trim().toLowerCase(),
            subject: data.subject.trim(),
            message: data.message.trim(),
            userId: data.userId || null,
            status: 'new' as const,
            createdAt: new Date().toISOString(),
            readAt: null,
        };

        // Save to Firestore
        const docRef = await db.collection('contactMessages').add(messageData);

        console.log('Contact message created:', docRef.id);

        revalidatePath('/contact');

        return {
            success: true,
            message: 'Thank you for your message! We will get back to you soon.'
        };
    } catch (error) {
        console.error('Error submitting contact message:', error);
        return {
            success: false,
            error: 'Failed to send message. Please try again later.'
        };
    }
}
