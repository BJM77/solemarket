import React from 'react';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DatasetSchema } from '@/components/seo/DatasetSchema';
import type { Metadata, ResolvingMetadata } from 'next';
import { aggregateMarketPulse } from '@/lib/market-pulse/aggregation';
import { getSampleMarketData } from '@/lib/market-pulse/sample-data';
import { SampleDataNotice } from '@/components/market-pulse/SampleDataNotice';

interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const { slug } = await params;
    const title = `Market Pulse (Preview): ${slug.replace(/-/g, ' ').toUpperCase()}`;
    return {
        title: `${title}`,
        description: `Preview Market Pulse report for ${slug.replace(/-/g, ' ')}. Figures shown are illustrative sample data, not real sales.`,
        // Sample figures shouldn't be indexed as real prices.
        robots: { index: false, follow: true },
    };
}

export const revalidate = 900;

export default async function MarketPulseSlugPage({ params }: Props) {
    const { slug } = await params;
    const rawSales = getSampleMarketData(slug);
    
    if (rawSales.length === 0) {
        // Option to notFound() here, or show a fallback
        return (
            <div className="min-h-screen pt-32 pb-20 text-center">
                <h1 className="text-3xl font-bold">Not Enough Sales Yet</h1>
                <p className="mt-4 text-muted-foreground">We don&apos;t have enough Benched sales for this item to show a price guide yet.</p>
            </div>
        );
    }

    const pulseData = aggregateMarketPulse(rawSales, rawSales[0]?.category || 'shoes');
    const displayTitle = slug.replace(/-/g, ' ').toUpperCase();

    return (
        <div className="bg-background min-h-screen pt-24 pb-20">
            <DatasetSchema 
                name={`Market Pulse: ${displayTitle}`}
                description={`Preview report for ${displayTitle}. Illustrative sample data, not real sales.`}
                url={`https://benched.au/market-pulse/${slug}`}
                dateModified={new Date().toISOString()}
                keywords={[displayTitle, 'price index', 'australian market data']}
            />
            
            <div className="max-w-5xl mx-auto px-4">
                <div className="mb-10">
                    <div className="text-primary font-bold uppercase tracking-widest text-sm mb-2">Market Pulse Report (Preview)</div>
                    <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">{displayTitle}</h1>
                </div>

                <SampleDataNotice className="mb-10" />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    <Card className="bg-muted/60 border-border">
                        <CardHeader>
                            <CardTitle className="text-sm text-muted-foreground uppercase tracking-widest">Market Average (90d)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold">${pulseData.averagePrice}</div>
                            <p className="text-xs text-muted-foreground mt-2">Based on {pulseData.volume} sample sales</p>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-muted/60 border-primary/30">
                        <CardHeader>
                            <CardTitle className="text-sm text-primary uppercase tracking-widest">Vault Verified Average</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold text-foreground">${pulseData.vaultVerified.averagePrice || 'N/A'}</div>
                            {pulseData.vaultVerified.premiumOverMarket > 0 && (
                                <Badge className="mt-2 bg-accent text-accent-foreground hover:bg-accent/80 border-none">
                                    +{pulseData.vaultVerified.premiumOverMarket}% Premium
                                </Badge>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-muted/60 border-border lg:col-span-1 md:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-sm text-muted-foreground uppercase tracking-widest">Data Confidence</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {pulseData.volume >= 5 ? (
                                <Badge className="bg-primary text-primary-foreground">High Confidence</Badge>
                            ) : (
                                <Badge variant="secondary" className="bg-amber-500/20 text-amber-700">Low Sample Size</Badge>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">Statistically filtered to remove market outliers.</p>
                        </CardContent>
                    </Card>
                </div>

                <h2 className="text-2xl font-bold mb-6 border-b border-border pb-4">Sample Sales</h2>
                <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/60">
                            <tr>
                                <th className="p-4 font-medium uppercase text-xs tracking-widest text-muted-foreground">Item Specs</th>
                                <th className="p-4 font-medium uppercase text-xs tracking-widest text-muted-foreground">Sale Price</th>
                                <th className="p-4 font-medium uppercase text-xs tracking-widest text-muted-foreground">Date</th>
                                <th className="p-4 font-medium uppercase text-xs tracking-widest text-muted-foreground">Provenance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {pulseData.recentSales.map((sale, i) => (
                                <tr key={i} className="bg-background hover:bg-muted/60 transition-colors">
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
                                            <Badge className="bg-accent text-accent-foreground border-none">Vault Verified</Badge>
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
