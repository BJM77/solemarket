import { AuthenticatedRequest, withAuth } from '@/lib/auth-wrapper';
import { scrapeEbayListings } from '@/lib/ebay-scraper';
import { parseWithGemini } from '@/lib/gemini-parser';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (request: AuthenticatedRequest) => {
    try {
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
}, { requiredRole: ['admin', 'superadmin'] });
