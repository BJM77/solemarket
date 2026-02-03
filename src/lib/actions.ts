"use server";

import { cookies } from "next/headers";

import { z } from "zod";
import {
    moderateContent,
    type ModerateContentOutput,
} from "@/ai/flows/ai-content-moderation";
import { notifySellerOfRemoval } from "@/ai/flows/notify-seller-of-removal";
import { detectFraud } from "@/ai/flows/detect-fraud";

const ModerationSchema = z.object({
    productName: z.string().min(1, { message: "Product name is required." }),
    productDescription: z
        .string()
        .min(1, { message: "Product description is required." }),
    productImageUri: z
        .string()
        .optional(),
});

export type ModerationState = {
    result?: ModerateContentOutput;
    error?: string;
    fields?: {
        productName?: string;
        productDescription?: string;
        productImageUri?: string;
    };
    message?: string;
};

export async function moderateProductAction(
    prevState: ModerationState,
    formData: FormData
): Promise<ModerationState> {
    const validatedFields = ModerationSchema.safeParse({
        productName: formData.get("productName"),
        productDescription: formData.get("productDescription"),
        productImageUri: formData.get("productImageUri"),
    });

    if (!validatedFields.success) {
        return {
            error: "Invalid fields.",
            fields: {
                productName: validatedFields.error.flatten().fieldErrors.productName?.join(", "),
                productDescription: validatedFields.error.flatten().fieldErrors.productDescription?.join(", "),
                productImageUri: validatedFields.error.flatten().fieldErrors.productImageUri?.join(", "),
            },
        };
    }

    try {
        const cookieStore = await cookies();
        const idToken = cookieStore.get('session')?.value;

        if (!idToken) {
            return {
                error: "Authentication required for moderation.",
            };
        }

        const result = await moderateContent({ ...validatedFields.data, idToken });
        return {
            result,
            message: "Content moderated successfully.",
        };
    } catch (e) {
        console.error(e);
        return {
            error: "Failed to moderate content. Please try again.",
        };
    }
}

const FraudSchema = z.object({
    details: z.string().min(1, { message: "Analysis details are required." }),
});

export type FraudState = {
    result?: {
        isFraudulent: boolean;
        riskScore: number;
        reason: string;
        recommendedAction?: string;
    };
    error?: string;
    message?: string;
};

export async function detectFraudAction(
    prevState: FraudState,
    formData: FormData
): Promise<FraudState> {
    const validatedFields = FraudSchema.safeParse({
        details: formData.get("details"),
    });

    if (!validatedFields.success) {
        return {
            error: "Invalid input.",
        };
    }

    try {
        const cookieStore = await cookies();
        const idToken = cookieStore.get('session')?.value;

        if (!idToken) {
            return {
                error: "Authentication required for fraud analysis.",
            };
        }

        const result = await detectFraud({ ...validatedFields.data, idToken });
        return {
            result,
            message: "Fraud analysis complete.",
        };
    } catch (e: any) {
        console.error(e);
        return {
            error: e.message || "Failed to analyze fraud patterns.",
        };
    }
}
