'use server';

import { z } from "zod";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, Timestamp } from "firebase/firestore";

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
    const email = formData.get("email");

    const validatedFields = NewsletterSchema.safeParse({ email });

    if (!validatedFields.success) {
        return {
            success: false,
            error: validatedFields.error.flatten().fieldErrors.email?.[0] || "Invalid email.",
        };
    }

    try {
        await addDoc(collection(db, "newsletter_subscribers"), {
            email: validatedFields.data.email,
            subscribedAt: Timestamp.now(),
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
