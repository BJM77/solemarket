import React from 'react';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DatasetSchema } from '@/components/seo/DatasetSchema';
import type { Metadata, ResolvingMetadata } from 'next';
import { aggregateMarketPulse, SaleDataPoint } from '@/lib/market-pulse/aggregation';

interface Props {
    params: Promise<{ slug: string }>;
}

// Temporary mock fetcher - eventually this reads from your DB based on slug
async function getMarketDataForSlug(slug: string): Promise<SaleDataPoint[]> {
    // Return empty array for testing fallback, or populated array if slug is recognized
    if (slug === 'jordan-1') {
        return [
            { id: '1', title: 'Jordan 1 Retro High Chicago', price: 612, soldAt: new Date(Date.now() - 2 * 86400000), category: 'shoes', isVaultVerified: true, grade: 'Brand New' },
            { id: '2', title: 'Jordan 1 Retro High Chicago', price: 540, soldAt: new Date(Date.now() - 5 * 86400000), category: 'shoes', isVaultVerified: false, grade: 'Lightly Used' },
            { id: '3', title: 'Jordan 1 Retro High Chicago', price: 738, soldAt: new Date(Date.now() - 10 * 86400000), category: 'shoes', isVaultVerified: true, grade: 'Brand New' },
            { id: '4', title: 'Jordan 1 Retro High Chicago', price: 490, soldAt: new Date(Date.now() - 15 * 86400000), category: 'shoes', isVaultVerified: false, grade: 'Used' },
        ];
    }
    // Return empty for unmapped items
    return [];
}

export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const { slug } = await params;
    const title = `Market Pulse: ${slug.replace(/-/g, ' ').toUpperCase()}`;
    return {
        title: `${title} | Benched AU Data`,
        description: `View real-time Australian sale prices, vault verified premiums, and market data for ${slug.replace(/-/g, ' ')}.`,
    };
}

export const revalidate = 900; // Cache for 15 minutes, as this is live data

export default async function MarketPulseSlugPage({ params }: Props) {
    const { slug } = await params;
    const rawSales = await getMarketDataForSlug(slug);
    
    if (rawSales.length === 0) {
        // Option to notFound() here, or show a fallback
        return (
            <div className="min-h-screen pt-32 pb-20 text-center">
                <h1 className="text-3xl font-bold">Insufficient Data</h1>
                <p className="mt-4 text-muted-foreground">We do not have enough verified sales data for this item yet.</p>
            </div>
        );
    }

    const pulseData = aggregateMarketPulse(rawSales, rawSales[0]?.category || 'shoes');
    const displayTitle = slug.replace(/-/g, ' ').toUpperCase();

    return (
        <div className="bg-black min-h-screen pt-24 pb-20">
            <DatasetSchema 
                name={`Market Pulse: ${displayTitle}`}
                description={`Australian sold prices, volume, and premium index for ${displayTitle}.`}
                url={`https://benched.au/market-pulse/${slug}`}
                dateModified={new Date().toISOString()}
                keywords={[displayTitle, 'price index', 'australian market data']}
            />
            
            <div className="max-w-5xl mx-auto px-4">
                <div className="mb-10">
                    <div className="text-emerald-500 font-bold uppercase tracking-widest text-sm mb-2">Market Pulse Report</div>
                    <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">{displayTitle}</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    <Card className="bg-white/5 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-sm text-muted-foreground uppercase tracking-widest">Market Average (90d)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold">${pulseData.averagePrice}</div>
                            <p className="text-xs text-muted-foreground mt-2">Based on {pulseData.volume} local sales</p>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-white/5 border-emerald-500/30">
                        <CardHeader>
                            <CardTitle className="text-sm text-emerald-500 uppercase tracking-widest">Vault Verified Average</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold text-white">${pulseData.vaultVerified.averagePrice || 'N/A'}</div>
                            {pulseData.vaultVerified.premiumOverMarket > 0 && (
                                <Badge className="mt-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-none">
                                    +{pulseData.vaultVerified.premiumOverMarket}% Premium
                                </Badge>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10 lg:col-span-1 md:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-sm text-muted-foreground uppercase tracking-widest">Data Confidence</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {pulseData.volume >= 5 ? (
                                <Badge className="bg-emerald-500">High Confidence</Badge>
                            ) : (
                                <Badge variant="secondary" className="bg-amber-500/20 text-amber-500">Low Sample Size</Badge>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">Statistically filtered to remove market outliers.</p>
                        </CardContent>
                    </Card>
                </div>

                <h2 className="text-2xl font-bold mb-6 border-b border-white/10 pb-4">Recent Included Sales</h2>
                <div className="overflow-x-auto rounded-lg border border-white/10">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="p-4 font-medium uppercase text-xs tracking-widest text-muted-foreground">Item Specs</th>
                                <th className="p-4 font-medium uppercase text-xs tracking-widest text-muted-foreground">Sale Price</th>
                                <th className="p-4 font-medium uppercase text-xs tracking-widest text-muted-foreground">Date</th>
                                <th className="p-4 font-medium uppercase text-xs tracking-widest text-muted-foreground">Provenance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {pulseData.recentSales.map((sale, i) => (
                                <tr key={i} className="bg-black hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold">{sale.title}</div>
                                        {sale.grade && <div className="text-xs text-muted-foreground mt-1">{sale.grade}</div>}
                                    </td>
                                    <td className="p-4 font-bold text-lg">${sale.price}</td>
                                    <td className="p-4 text-muted-foreground">
                                        {new Date(sale.soldAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="p-4">
                                        {sale.isVaultVerified ? (
                                            <Badge className="bg-emerald-500/20 text-emerald-400 border-none">Vault Verified</Badge>
                                        ) : (
                                            <span className="text-muted-foreground text-xs uppercase tracking-wider">Unverified P2P</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
