import React from 'react';
import { notFound } from 'next/navigation';
import { getRoutesByCategoryAndPriority, PROGRAMMATIC_ROUTES } from '@/config/programmatic-seo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import Link from 'next/link';

interface Props {
    params: { slug: string[] }; // Captures multiple segments e.g. ['jordan', '1']
}

export async function generateStaticParams() {
    return PROGRAMMATIC_ROUTES.map((route) => {
        return {
            slug: route.path.split('/'),
        };
    });
}

export async function generateMetadata({ params }: Props) {
    const path = params.slug.join('/');
    const route = PROGRAMMATIC_ROUTES.find(r => r.path === path);
    
    if (!route) return { title: 'Not Found' };
    
    const titleParts = params.slug.map(s => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' '));
    const title = titleParts.join(' ');

    return {
        title: `Buy ${title} in Australia | Benched AU`,
        description: `Compare prices, check live market data, and buy authentic ${title} from Australian sellers. 100% verified via the Benched Vault.`,
    };
}

export const revalidate = 86400; // Cache for 24 hours

export default function ProgrammaticSeoPage({ params }: Props) {
    const path = params.slug.join('/');
    const route = PROGRAMMATIC_ROUTES.find(r => r.path === path);
    
    if (!route) {
        notFound();
    }

    const titleParts = params.slug.map(s => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' '));
    const title = titleParts.join(' ');
    
    // We would fetch actual active listings for this query here
    // For now, we mock the UI

    return (
        <div className="bg-black min-h-screen pt-24 pb-20">
            <div className="max-w-6xl mx-auto px-4">
                <div className="mb-12 border-b border-white/10 pb-8">
                    <div className="text-emerald-500 font-bold uppercase tracking-widest text-sm mb-2">{route.category}</div>
                    <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4">
                        Buy {title}
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-3xl">
                        Browse our live marketplace for verified {title}. All items are authenticated by our Perth-based Vault team before shipping.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2">
                        <h2 className="text-2xl font-bold mb-6">Live Listings</h2>
                        {route.hasInventory ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {/* Mock listing cards */}
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <Card key={i} className="bg-white/5 border-white/10 overflow-hidden group cursor-pointer hover:border-emerald-500/50 transition-colors">
                                        <div className="h-40 bg-white/10 flex items-center justify-center p-4">
                                            <div className="text-muted-foreground opacity-30 text-4xl font-black italic">{title}</div>
                                        </div>
                                        <CardContent className="p-4">
                                            <div className="font-bold line-clamp-1 mb-1">{title}</div>
                                            <div className="text-emerald-500 font-bold mb-2">From $299</div>
                                            <div className="text-xs text-muted-foreground">Vault Verified</div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
                                <h3 className="text-xl font-bold mb-2">No Active Listings</h3>
                                <p className="text-muted-foreground mb-6">There are currently no active listings for {title}. Be the first to list yours!</p>
                                <Link href="/sell" className="px-6 py-3 bg-emerald-500 text-black font-bold uppercase tracking-wider rounded-full hover:bg-emerald-600 transition-colors">
                                    Sell Yours Now
                                </Link>
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-6">
                        <Card className="bg-white/5 border-white/10">
                            <CardHeader>
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-emerald-500" />
                                    Market Intelligence
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <p className="text-muted-foreground">
                                    Want to see historical pricing and the Vault premium for {title}?
                                </p>
                                <Link href="/market-pulse" className="block w-full text-center py-2 px-4 bg-white/10 hover:bg-white/20 transition-colors rounded font-medium">
                                    View Market Pulse &rarr;
                                </Link>
                            </CardContent>
                        </Card>
                        
                        <Card className="bg-white/5 border-emerald-500/30">
                            <CardContent className="p-6">
                                <h3 className="font-bold text-emerald-500 mb-2">100% Authenticity Guarantee</h3>
                                <p className="text-sm text-muted-foreground">
                                    Every item sold on Benched is physically verified by our expert team using cryptographic tags and multi-point inspection.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
