'use server';

import { z } from "zod";
import { firestoreDb, admin as firebaseAdmin } from "@/lib/firebase/admin";
import { sendNotification, getSuperAdminId } from "@/services/notifications";
import { Resend } from 'resend';

// Initialize Resend with API Key (simulated success if key missing to prevent crash)
const resend = new Resend(process.env.RESEND_API_KEY);

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
    errors?: {
        name?: string[];
        email?: string[];
        phone?: string[];
        itemType?: string[];
        estimatedValue?: string[];
        description?: string[];
    };
    values?: {
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
            errors: validatedFields.error.flatten().fieldErrors as any,
            values: rawData as any,
        };
    }

    try {
        const { name, email, phone, itemType, estimatedValue, description } = validatedFields.data;

        // 1. Save to Firestore
        const consignmentRef = await firestoreDb.collection("consignment_inquiries").add({
            name,
            email,
            phone: phone || null,
            itemType,
            estimatedValue,
            description,
            status: "new",
            createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        });

        // 1b. Duplicate to unified enquiries collection for central management
        await firestoreDb.collection("enquiries").add({
            name,
            email,
            phoneNumber: phone || null,
            message: `[CONSIGNMENT] Item: ${itemType} | Estimated Value: ${estimatedValue}\n\nDescription: ${description}`,
            type: 'consign',
            status: 'new',
            subject: `Consignment Inquiry: ${itemType}`,
            createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
            originalId: consignmentRef.id
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

        // 3. Send Emails (Admin Notification + User Confirmation)
        // We use Promise.allSettled to ensure one failing doesn't stop the other
        await Promise.allSettled([
            sendAdminNotificationEmail(validatedFields.data),
            sendConfirmationEmail(email, name)
        ]);

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
 * Sends a confirmation email to the user using Resend.
 */
async function sendConfirmationEmail(email: string, name: string): Promise<void> {
    if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY is not set. Skipping email sending.');
        return;
    }

    try {
        await resend.emails.send({
            from: 'Picksy Consignments <consign@picksy.au>',
            to: email,
            subject: 'We received your consignment inquiry',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1>Thanks for reaching out, ${name}!</h1>
                    <p>We have received your consignment inquiry and our team will review it shortly.</p>
                    <p>We typically respond within 1-2 business days.</p>
                    <hr />
                    <p style="color: #666; font-size: 12px;">Picksy Marketplace - The Premier Marketplace for Collectors</p>
                </div>
            `,
        });
        console.log(`[EMAIL SENT] To: ${email} via Resend`);
    } catch (error) {
        console.error('Failed to send confirmation email:', error);
        // Don't throw, just log error so the user flow isn't interrupted
    }
}

/**
 * Sends a notification email to the admin.
 */
async function sendAdminNotificationEmail(data: any): Promise<void> {
    if (!process.env.RESEND_API_KEY) return;

    // In a real app, fetch this from config or env
    const ADMIN_EMAIL = 'ben@picksy.au'; // Default fallback or use env var

    try {
        await resend.emails.send({
            from: 'Picksy Bot <system@picksy.au>',
            to: ADMIN_EMAIL,
            subject: `New Consignment: ${data.itemType} ($${data.estimatedValue})`,
            html: `
                <h2>New Consignment Inquiry</h2>
                <p><strong>Name:</strong> ${data.name}</p>
                <p><strong>Email:</strong> ${data.email}</p>
                <p><strong>Phone:</strong> ${data.phone || 'N/A'}</p>
                <p><strong>Item Type:</strong> ${data.itemType}</p>
                <p><strong>Est. Value:</strong> ${data.estimatedValue}</p>
                <p><strong>Description:</strong><br/>${data.description}</p>
                <hr />
                <a href="https://picksy.au/admin/consignments">View in Admin Dashboard</a>
            `,
        });
    } catch (error) {
        console.error('Failed to send admin notification email:', error);
    }
}
