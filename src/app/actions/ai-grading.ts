'use server';

import { gradeCardDetails as gradeCardDetailsFlow } from '@/ai/flows/grade-card-details';
import { suggestListingDetails as suggestListingDetailsFlow, SuggestListingDetailsOutput } from '@/ai/flows/suggest-listing-details';
import { GradeCardDetailsOutput } from '@/ai/schemas/grading-schemas';

export async function gradeCardDetailsAction(input: {
    frontImageDataUri: string;
    backImageDataUri?: string;
    cardName?: string;
    idToken?: string;
}): Promise<GradeCardDetailsOutput> {
    return await gradeCardDetailsFlow(input);
}

export async function suggestListingDetailsAction(input: {
    photoDataUris: string[];
    title?: string;
    idToken?: string;
}): Promise<SuggestListingDetailsOutput> {
    return await suggestListingDetailsFlow(input);
}
