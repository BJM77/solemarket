'use server';
import { checkRateLimit } from '@/lib/rate-limit-guard';

import { z } from "zod";
import { firestoreDb, admin } from "@/lib/firebase/admin";

const NewsletterSchema = z.object({
    email: z.string().email("Please enter a valid email address."),
});

export type NewsletterState = {
    success?: boolean;
    error?: string;
    message?: string;
};

export async function subscribeToNewsletter(
    prevState: NewsletterState,
    formData: FormData
): Promise<NewsletterState> {
    if (!(await checkRateLimit('newsletter', { limit: 5, windowSeconds: 3600 }))) {
        return { success: false, message: 'Too many requests. Please wait a moment and try again.', error: 'Too many requests. Please wait a moment and try again.' } as any;
    }
    const email = formData.get("email");

    const validatedFields = NewsletterSchema.safeParse({ email });

    if (!validatedFields.success) {
        return {
            success: false,
            error: validatedFields.error.flatten().fieldErrors.email?.[0] || "Invalid email.",
        };
    }

    try {
        await firestoreDb.collection("newsletter_subscribers").add({
            email: validatedFields.data.email,
            subscribedAt: admin.firestore.Timestamp.now(),
            source: "footer_v1",
        });

        return {
            success: true,
            message: "Thanks for subscribing!",
        };
    } catch (e) {
        console.error("Newsletter subscription error:", e);
        return {
            success: false,
            error: "Something went wrong. Please try again.",
        };
    }
}
