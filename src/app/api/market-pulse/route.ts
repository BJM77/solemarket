import { NextResponse } from 'next/server';
import { aggregateMarketPulse } from '@/lib/market-pulse/aggregation';
import { MARKET_PULSE_IS_SAMPLE, MARKET_PULSE_SAMPLE_NOTICE, getSampleMarketData } from '@/lib/market-pulse/sample-data';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
        // Return index of all pulse pages
        return NextResponse.json({
            '@context': 'https://schema.org',
            '@type': 'DataCatalog',
            name: 'Benched Market Pulse',
            description: 'Preview of the Benched price guide. Figures are illustrative sample data, not real sales.',
            isSampleData: MARKET_PULSE_IS_SAMPLE,
            notice: MARKET_PULSE_SAMPLE_NOTICE,
            dataset: [
                'jordan-1', 'nike-dunk-low', 'kobe-6', 
                'panini-prizm-basketball', 'michael-jordan-fleer', 
                '1930-australian-penny'
            ]
        });
    }

    // Return specific pulse dataset
    const rawSales = getSampleMarketData(slug);
    
    if (rawSales.length === 0) {
        return NextResponse.json({ error: 'Data not found or insufficient sales volume' }, { status: 404 });
    }

    const pulseData = aggregateMarketPulse(rawSales, rawSales[0].category);

    return NextResponse.json({
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: `Market Pulse: ${slug.replace(/-/g, ' ').toUpperCase()}`,
        description: `Preview figures for ${slug.replace(/-/g, ' ')}. Illustrative sample data, not real sales.`,
        isSampleData: MARKET_PULSE_IS_SAMPLE,
        notice: MARKET_PULSE_SAMPLE_NOTICE,
        data: {
            averagePrice: pulseData.averagePrice,
            medianPrice: pulseData.medianPrice,
            volume: pulseData.volume,
            vaultPremium: pulseData.vaultVerified.premiumOverMarket,
            recentSales: pulseData.recentSales.map(s => ({
                price: s.price,
                date: s.soldAt.toISOString(),
                isVaultVerified: s.isVaultVerified,
                grade: s.grade
            }))
        }
    });
}
