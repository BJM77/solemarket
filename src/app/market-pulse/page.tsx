import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Activity, ShieldCheck } from 'lucide-react';
import { SampleDataNotice } from '@/components/market-pulse/SampleDataNotice';
import { DatasetSchema } from '@/components/seo/DatasetSchema';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Market Pulse (Preview)',
    description: 'A preview of the Benched Market Pulse price guide for popular sneakers and basketball cards in Australia. Figures shown are sample data for now.',
};

export const revalidate = 3600; // Cache for 1 hour

const TOP_MARKETS = [
    { slug: 'jordan-1', title: 'Jordan 1 Retro High', category: 'shoes' },
    { slug: 'nike-dunk-low', title: 'Nike Dunk Low', category: 'shoes' },
    { slug: 'kobe-6', title: 'Nike Kobe 6 Protro', category: 'shoes' },
    { slug: 'panini-prizm-basketball', title: 'Panini Prizm NBA Cards', category: 'cards' },
    { slug: 'michael-jordan-fleer', title: 'Michael Jordan Fleer Cards', category: 'cards' }
];

export default function MarketPulseIndexPage() {
    return (
        <div className="bg-background min-h-screen pt-24 pb-20">
            <DatasetSchema 
                name="Benched AU Market Pulse Index"
                description="Preview of the Benched Market Pulse price guide. Figures are illustrative sample data, not real sales."
                url="https://benched.au/market-pulse"
                dateModified={new Date().toISOString()}
                keywords={['australian collectible prices', 'sneaker price index', 'card price guide', 'benched market pulse']}
            />
            
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">
                        Market <span className="text-primary">Pulse</span>
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                        A price guide for Australian sneakers and basketball cards, built from sales on Benched.
                        It&apos;s in preview while we gather enough completed sales.
                    </p>
                </div>

                <SampleDataNotice className="mb-10 max-w-3xl mx-auto" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    <Card className="bg-muted/60 border-border">
                        <CardHeader>
                            <CardTitle className="text-primary flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5" />
                                Vault Verified Premium
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Each report will compare Vault-verified sales with unverified peer-to-peer sales, so you can see what verification is worth. We&apos;ll publish real figures once there are enough sales.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-muted/60 border-border">
                        <CardHeader>
                            <CardTitle className="text-primary flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                How It Works
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Prices are filtered for outliers (using IQR) so one odd sale doesn&apos;t skew the average. Treat every figure as a guide, not an exact value.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-muted/60 border-border">
                        <CardHeader>
                            <CardTitle className="text-primary flex items-center gap-2">
                                <Activity className="h-5 w-5" />
                                Free API Access
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                A free JSON feed is available at /api/market-pulse. While Market Pulse is in preview it returns the same sample data and marks it as sample.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <h2 className="text-2xl font-bold mb-6">Markets in the Preview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {TOP_MARKETS.map(market => (
                        <Link key={market.slug} href={`/market-pulse/${market.slug}`}>
                            <div className="p-6 rounded-lg border border-border bg-muted/60 hover:bg-muted transition-colors cursor-pointer group">
                                <div className="text-xs uppercase tracking-widest text-primary mb-2">{market.category}</div>
                                <h3 className="text-xl font-bold group-hover:underline underline-offset-4">{market.title}</h3>
                                <div className="mt-4 flex items-center text-sm text-muted-foreground gap-2">
                                    <Activity className="h-4 w-4" />
                                    View sample report &rarr;
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
