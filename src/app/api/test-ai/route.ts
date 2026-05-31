import { NextResponse } from 'next/server';
import { suggestListingDetails } from '@/ai/flows/suggest-listing-details';

export async function POST(req: Request) {
    try {
        const { uris } = await req.json();
        const result = await suggestListingDetails({ photoDataUris: uris, idToken: 'test' });
        return NextResponse.json(result);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
