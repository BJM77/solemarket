'use client';

import ProductGrid from '@/components/products/ProductGrid';
import type { Product } from '@/lib/types';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function TrendingGrid({ products }: { products: Product[] }) {
    if (!products || products.length === 0) return null;

    return (
        <section className="py-20 bg-white dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-end justify-between mb-10">
                    <div>
                        <h2 className="text-4xl font-black mb-2">Trending Near You</h2>
                        <p className="text-gray-500 text-lg">Fresh finds from verified local sellers.</p>
                    </div>
                    <Button variant="ghost" className="hidden md:flex gap-2 text-primary hover:text-primary hover:bg-primary/5 font-bold" asChild>
                        <Link href="/browse">
                            View All <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </div>

                <ProductGrid products={products} />

                <div className="mt-12 text-center md:hidden">
                    <Button size="lg" className="w-full" asChild>
                        <Link href="/browse">View All Listings</Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}
