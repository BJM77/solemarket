'use server';

import { gradeCardDetails as gradeCardDetailsFlow } from '@/ai/flows/grade-card-details';
import { suggestListingDetails as suggestListingDetailsFlow, SuggestListingDetailsOutput } from '@/ai/flows/suggest-listing-details';
import { GradeCardDetailsOutput } from '@/ai/schemas/grading-schemas';
import { RateLimiter } from '@/lib/rate-limiter';
import { verifyIdToken } from '@/lib/firebase/auth-admin';

// Initialize rate limiter: 10 requests per 5 minutes per user
const aiRateLimiter = new RateLimiter({
    windowMs: 5 * 60 * 1000,
    maxRequests: 10
});

async function checkRateLimit(idToken?: string) {
    if (!idToken) return; // Let the flow handle missing auth or verifyIdToken handle it
    
    try {
        const decoded = await verifyIdToken(idToken);
        const allowed = aiRateLimiter.checkLimit(decoded.uid);
        if (!allowed) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }
    } catch (e) {
        // If token verification fails here, let the main flow handle it strictly if needed.
        // But for rate limiting purposes, we prioritize protecting the resource.
        // If verifyIdToken throws, we rethrow.
        throw e;
    }
}

export async function gradeCardDetailsAction(input: {
    frontImageDataUri: string;
    backImageDataUri?: string;
    cardName?: string;
    idToken?: string;
}): Promise<GradeCardDetailsOutput> {
    await checkRateLimit(input.idToken);
    return await gradeCardDetailsFlow(input);
}

export async function suggestListingDetailsAction(input: {
    photoDataUris: string[];
    title?: string;
    idToken?: string;
}): Promise<SuggestListingDetailsOutput> {
    try {
        await checkRateLimit(input.idToken);
        return await suggestListingDetailsFlow(input);
    } catch (error: any) {
        console.error('suggestListingDetailsAction error:', error);
        throw error;
    }
}
