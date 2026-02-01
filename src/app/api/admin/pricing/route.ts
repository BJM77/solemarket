import { NextRequest, NextResponse } from 'next/server';
import { scrapeEbayListings } from '@/lib/ebay-scraper';
import { parseWithGemini } from '@/lib/gemini-parser';
import { auth, firestoreDb } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        try {
            const decodedToken = await auth.verifyIdToken(token);

            // Verification of role (SuperAdmin only)
            const userDoc = await firestoreDb.collection('users').doc(decodedToken.uid).get();
            const userData = userDoc.data();

            if (userData?.role !== 'superadmin' && userData?.role !== 'admin') {
                return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
            }
        } catch (e) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
        }

        const { productId, title } = await request.json();

        if (!title) {
            return NextResponse.json({ error: 'Search title is required' }, { status: 400 });
        }

        // 1. Scrape eBay
        const scrapeResult = await scrapeEbayListings({
            keyword: title,
            maxPages: 1, // Start with 1 page for speed
            country: 'au'
        });

        // 2. Parse with Gemini
        const pricingComps = await parseWithGemini(scrapeResult);

        return NextResponse.json({
            success: true,
            comps: pricingComps,
            metadata: scrapeResult.metadata
        });

    } catch (error: any) {
        console.error('Pricing API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
