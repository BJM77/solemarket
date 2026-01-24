'use server';

import { z } from "zod";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { sendNotification, getSuperAdminId } from "@/services/notifications";

const ConsignmentSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    itemType: z.string().min(1, "Please select an item type"),
    estimatedValue: z.string().min(1, "Please provide an estimated value"),
    description: z.string().min(10, "Please provide more details about your collection"),
});

export type ConsignmentState = {
    success?: boolean;
    error?: string;
    fields?: {
        name?: string;
        email?: string;
        phone?: string;
        itemType?: string;
        estimatedValue?: string;
        description?: string;
    };
    message?: string;
};

export async function submitConsignmentInquiry(
    prevState: ConsignmentState,
    formData: FormData
): Promise<ConsignmentState> {
    const rawData = {
        name: formData.get("name"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        itemType: formData.get("itemType"),
        estimatedValue: formData.get("estimatedValue"),
        description: formData.get("description"),
    };

    const validatedFields = ConsignmentSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            success: false,
            error: "Please correct the errors below.",
            fields: validatedFields.error.flatten().fieldErrors as any,
        };
    }

    try {
        const { name, email, phone, itemType, estimatedValue, description } = validatedFields.data;

        // 1. Save to Firestore
        await addDoc(collection(db, "consignment_inquiries"), {
            name,
            email,
            phone: phone || null,
            itemType,
            estimatedValue,
            description,
            status: "new",
            createdAt: Timestamp.now(),
        });

        // 2. Notify Admin
        const adminId = await getSuperAdminId();
        if (adminId) {
            await sendNotification(
                adminId,
                "system",
                "New Consignment Inquiry",
                `From: ${name}\nType: ${itemType}\nValue: ${estimatedValue}\nDesc: ${description.substring(0, 50)}...`,
                "/admin/consignments"
            );
        }

        // 3. Send Confirmation Email (Simulated)
        await sendConfirmationEmail(email, name);

        return {
            success: true,
            message: "Thank you! Your inquiry has been sent. We've sent a confirmation email to your inbox.",
        };
    } catch (e) {
        console.error("Consignment submission error:", e);
        return {
            success: false,
            error: "Something went wrong. Please try again later.",
        };
    }
}

/**
 * Sends a confirmation email to the user.
 * 
 * TODO: Integrate with a real email service provider (e.g., Resend, SendGrid, AWS SES).
 * Currently, this function simulates sending an email by logging to the console.
 */
async function sendConfirmationEmail(email: string, name: string): Promise<void> {
    // In a production environment, you would use an email SDK here.
    // Example with Resend:
    // await resend.emails.send({
    //   from: 'Consignments <consign@picksy.au>',
    //   to: email,
    //   subject: 'We received your consignment inquiry',
    //   react: EmailTemplate({ name }),
    // });

    console.log(`[SIMULATED EMAIL] To: ${email}`);
    console.log(`[SIMULATED EMAIL] Subject: We received your consignment inquiry`);
    console.log(`[SIMULATED EMAIL] Body: Hi ${name}, thanks for reaching out! We'll be in touch shortly.`);
    
    return Promise.resolve();
}
