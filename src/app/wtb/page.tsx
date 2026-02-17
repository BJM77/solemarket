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
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <section className="bg-gradient-to-b from-primary/5 to-background border-b">
                <div className="container mx-auto max-w-screen-2xl px-4 py-12 md:py-16">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-headline mb-3">
                                Wanted To Buy
                            </h1>
                            <p className="text-lg text-muted-foreground max-w-2xl">
                                Connect with verified collectors actively seeking specific sneakers. Post what you're looking for or help someone find their grail.
                            </p>
                        </div>
                        <Button asChild size="lg" className="h-12">
                            <Link href="/wtb/create">
                                <Plus className="mr-2 h-5 w-5" />
                                Post WTB Listing
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Listings Grid */}
            <section className="container mx-auto max-w-screen-2xl px-4 py-8">
                {loading ? (
                    <div className="text-center py-16">
                        <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
                        <p className="text-muted-foreground">Loading listings...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-16">
                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 max-w-md mx-auto">
                            <p className="text-destructive font-semibold mb-2">Error loading listings</p>
                            <p className="text-sm text-muted-foreground">{error}</p>
                        </div>
                    </div>
                ) : listings.length === 0 ? (
                    <div className="text-center py-16">
                        <Search className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                        <h2 className="text-2xl font-bold mb-2">No active WTB listings yet</h2>
                        <p className="text-muted-foreground mb-6">Be the first to post what you're looking for!</p>
                        <Button asChild size="lg">
                            <Link href="/wtb/create">
                                <Plus className="mr-2 h-5 w-5" />
                                Create WTB Listing
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold">{listings.length} Active Requests</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
