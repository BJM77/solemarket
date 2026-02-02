import { NextResponse } from 'next/server';
import { firestoreDb } from '@/lib/firebase/admin';

export async function POST(request: Request) {
    try {
        const errorData = await request.json();

        // Log to Firestore for later review
        await firestoreDb.collection('errors').add({
            ...errorData,
            serverTimestamp: new Date(),
        });

        // In a real production app, you might also forward this to Sentry or another service
        console.error('Client-side error logged:', errorData);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to log client-side error:', error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
