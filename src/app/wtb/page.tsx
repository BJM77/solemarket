import { Metadata } from 'next';
import { getWTBListings } from '@/app/actions/wtb';
import { WTBCard } from '@/components/wtb/WTBCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Search, Plus } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Wanted To Buy | Picksy Marketplace',
    description: 'Browse items that collectors are actively looking to buy. Connect with verified buyers seeking specific collectibles.',
    keywords: 'wanted to buy, WTB, collectibles wanted, trading cards wanted, coins wanted, buy requests',
};

export const revalidate = 60;

export default async function WTBBrowsePage() {
    const { listings } = await getWTBListings({ status: 'active', limit: 50 });

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
                                Connect with verified collectors actively seeking specific items. Post what you're looking for or help someone find their grail.
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
                {listings.length === 0 ? (
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
