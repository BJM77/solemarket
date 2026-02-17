'use client';

import ProductGrid from '@/components/products/ProductGrid';
import type { Product } from '@/lib/types';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function TrendingGrid({ products, title = "Trending Near You" }: { products: Product[], title?: string }) {
    if (!products || products.length === 0) return null;

    return (
        <section className="py-20 bg-background">
            <div className="max-w-[1440px] mx-auto px-4 md:px-10">
                <div className="flex items-end justify-between mb-10">
                    <div>
                        <h2 className="text-3xl md:text-5xl font-black mb-2 tracking-tight uppercase italic">{title}</h2>
                        <p className="text-muted-foreground text-sm md:text-lg font-medium">Fresh finds from verified local rotations.</p>
                    </div>
                    <Button variant="ghost" className="hidden md:flex gap-2 text-primary hover:text-primary hover:bg-primary/5 font-black uppercase tracking-widest text-xs" asChild>
                        <Link href="/browse">
                            View All <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </div>

                <ProductGrid products={products} />

                <div className="mt-12 text-center md:hidden">
                    <Button size="lg" className="w-full font-black rounded-2xl h-14" asChild>
                        <Link href="/browse">View Full Roster</Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}
