import { NextResponse } from 'next/server';
import { aggregateMarketPulse } from '@/lib/market-pulse/aggregation';

// Mock DB fallback
async function getMarketDataForSlug(slug: string) {
    if (slug === 'jordan-1') {
        return [
            { id: '1', title: 'Jordan 1 Retro High Chicago', price: 612, soldAt: new Date(Date.now() - 2 * 86400000), category: 'shoes', isVaultVerified: true, grade: 'Brand New' },
            { id: '2', title: 'Jordan 1 Retro High Chicago', price: 540, soldAt: new Date(Date.now() - 5 * 86400000), category: 'shoes', isVaultVerified: false, grade: 'Lightly Used' },
            { id: '3', title: 'Jordan 1 Retro High Chicago', price: 738, soldAt: new Date(Date.now() - 10 * 86400000), category: 'shoes', isVaultVerified: true, grade: 'Brand New' },
            { id: '4', title: 'Jordan 1 Retro High Chicago', price: 490, soldAt: new Date(Date.now() - 15 * 86400000), category: 'shoes', isVaultVerified: false, grade: 'Used' },
        ];
    }
    return [];
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
        // Return index of all pulse pages
        return NextResponse.json({
            '@context': 'https://schema.org',
            '@type': 'DataCatalog',
            name: 'Benched Market Pulse',
            description: 'Australian collectibles market price index',
            dataset: [
                'jordan-1', 'nike-dunk-low', 'kobe-6', 
                'panini-prizm-basketball', 'michael-jordan-fleer', 
                '1930-australian-penny'
            ]
        });
    }

    // Return specific pulse dataset
    const rawSales = await getMarketDataForSlug(slug);
    
    if (rawSales.length === 0) {
        return NextResponse.json({ error: 'Data not found or insufficient sales volume' }, { status: 404 });
    }

    const pulseData = aggregateMarketPulse(rawSales, rawSales[0].category);

    return NextResponse.json({
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: `Market Pulse: ${slug.replace(/-/g, ' ').toUpperCase()}`,
        description: `Australian sold prices for ${slug.replace(/-/g, ' ')}`,
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
