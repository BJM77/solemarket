import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Activity, ShieldCheck } from 'lucide-react';
import { DatasetSchema } from '@/components/seo/DatasetSchema';
import type { Metadata } from 'next';
import { brandConfig } from '@/config/brand';

export const metadata: Metadata = {
    title: `Market Pulse Data Index | ${brandConfig.seo.defaultTitle}`,
    description: 'Explore verified, Australian market prices and sales volume for the most popular sneakers, cards, and coins on Benched.',
};

export const revalidate = 3600; // Cache for 1 hour

const TOP_MARKETS = [
    { slug: 'jordan-1', title: 'Jordan 1 Retro High', category: 'shoes' },
    { slug: 'nike-dunk-low', title: 'Nike Dunk Low', category: 'shoes' },
    { slug: 'kobe-6', title: 'Nike Kobe 6 Protro', category: 'shoes' },
    { slug: 'panini-prizm-basketball', title: 'Panini Prizm NBA Cards', category: 'cards' },
    { slug: 'michael-jordan-fleer', title: 'Michael Jordan Fleer Cards', category: 'cards' },
    { slug: '1930-australian-penny', title: '1930 Australian Penny', category: 'coins' }
];

export default function MarketPulseIndexPage() {
    return (
        <div className="bg-black min-h-screen pt-24 pb-20">
            <DatasetSchema 
                name="Benched AU Market Pulse Index"
                description="Aggregated data index of authentic Australian collectibles sales prices."
                url="https://benched.au/market-pulse"
                dateModified={new Date().toISOString()}
                keywords={['australian collectible prices', 'sneaker price index', 'card price guide', 'benched market pulse']}
            />
            
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">
                        Market <span className="text-emerald-500">Pulse</span>
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                        The source of truth for Australian collectibles pricing. 
                        Live, verified sales data segmented by Vault-authenticated transactions.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    <Card className="bg-white/5 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-emerald-500 flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5" />
                                Vault Verified Premium
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-white/70">
                                Across our platform, Vault-verified items command an average <span className="text-white font-bold">+18% price premium</span> compared to unverified peer-to-peer sales. Trust pays.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-emerald-500 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Real-Time Accuracy
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-white/70">
                                Our index filters out statistical anomalies (using IQR) and false sales, providing you with the exact market value for items trading hands in Australia today.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-emerald-500 flex items-center gap-2">
                                <Activity className="h-5 w-5" />
                                Free API Access
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-white/70">
                                This dataset is completely open for AI researchers and market analysts. Check our JSON feeds to integrate Benched pricing into your own tools.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <h2 className="text-2xl font-bold mb-6">Top Tracked Markets</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {TOP_MARKETS.map(market => (
                        <Link key={market.slug} href={`/market-pulse/${market.slug}`}>
                            <div className="p-6 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                                <div className="text-xs uppercase tracking-widest text-emerald-500 mb-2">{market.category}</div>
                                <h3 className="text-xl font-bold group-hover:underline underline-offset-4">{market.title}</h3>
                                <div className="mt-4 flex items-center text-sm text-muted-foreground gap-2">
                                    <Activity className="h-4 w-4" />
                                    View Live Pulse Data &rarr;
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
