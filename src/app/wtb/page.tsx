'use client';

import { useEffect, useState } from 'react';
import { getWTBListingsClient } from '@/lib/wtb-client';
import { WTBCard } from '@/components/wtb/WTBCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Search, Plus, Loader2 } from 'lucide-react';
import type { WantedListing } from '@/lib/types';

export default function WTBBrowsePage() {
    const [listings, setListings] = useState<WantedListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchListings() {
            try {
                setLoading(true);
                const result = await getWTBListingsClient({ status: 'active', limit: 50 });

                if (result.success) {
                    setListings(result.listings);
                } else {
                    setError(result.error || 'Failed to load listings');
                }
            } catch (err: any) {
                setError(err.message || 'An error occurred');
            } finally {
                setLoading(false);
            }
        }

        fetchListings();
    }, []);

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Hero Section */}
            <section className="relative py-20 overflow-hidden border-b border-white/5 bg-slate-900/40 backdrop-blur-sm">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary opacity-10 blur-[120px] -mr-48 -mt-48 transition-all animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 opacity-5 blur-[100px] -ml-32 -mb-32"></div>

                <div className="container mx-auto max-w-screen-2xl px-6 relative z-10">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                        <div className="text-left">
                            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 italic">
                                Wanted To <span className="text-primary">Buy.</span>
                            </h1>
                            <p className="text-xl text-slate-400 max-w-2xl leading-relaxed">
                                Connect with verified collectors actively seeking specifics. Post what you're hunting or help someone find their grail.
                            </p>
                        </div>
                        <Button asChild size="lg" className="h-16 px-10 text-xl font-black italic rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                            <Link href="/wtb/create">
                                <Plus className="mr-3 h-6 w-6" />
                                Post Request
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Listings Grid */}
            <section className="container mx-auto max-w-screen-2xl px-6 py-16">
                {loading ? (
                    <div className="text-center py-24 bg-white/5 rounded-[3rem] border border-white/5">
                        <Loader2 className="w-16 h-16 mx-auto animate-spin text-primary mb-6" />
                        <p className="text-xl font-bold italic text-slate-400">Scanning the vault...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-24 bg-red-500/5 rounded-[3rem] border border-red-500/10">
                        <div className="max-w-md mx-auto">
                            <p className="text-2xl font-black text-red-500 mb-4 italic">Connection Interrupted</p>
                            <p className="text-slate-400 mb-8">{error}</p>
                            <Button variant="outline" onClick={() => window.location.reload()} className="border-red-500/20 text-red-500 hover:bg-red-500/10">
                                Try Again
                            </Button>
                        </div>
                    </div>
                ) : listings.length === 0 ? (
                    <div className="text-center py-32 bg-white/5 rounded-[3rem] border border-dashed border-white/10 group">
                        <Search className="w-24 h-24 mx-auto text-slate-800 mb-8 transition-transform group-hover:scale-110 duration-500" />
                        <h2 className="text-4xl font-black mb-4 italic">The feed is clear.</h2>
                        <p className="text-slate-400 mb-12 text-xl max-w-lg mx-auto">Be the first to demand a specific piece and let the market find you.</p>
                        <Button asChild size="lg" className="h-14 px-10 rounded-xl">
                            <Link href="/wtb/create">
                                <Plus className="mr-2 h-5 w-5" />
                                Create First Listing
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-12">
                            <div className="flex items-center gap-4">
                                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                <h2 className="text-2xl font-black italic tracking-wider uppercase text-slate-400">
                                    {listings.length} Open Inquiries
                                </h2>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {listings.map((listing) => (
                                <WTBCard key={listing.id} listing={listing} />
                            ))}
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}
