'use client';

import ProductGrid from '@/components/products/ProductGrid';
import type { Product } from '@/lib/types';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function TrendingGrid({ products, title = "Trending Near You" }: { products: Product[], title?: string }) {
    if (!products || products.length === 0) return null;

    return (
        <section className="bg-background py-16 lg:py-24 relative overflow-hidden">
            <div className="max-w-[1440px] mx-auto px-6 md:px-10 relative z-10">
                <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-4">
                    <div>
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">{title}</h2>
                        <p className="text-sm md:text-lg text-slate-500 dark:text-slate-400 mt-2 font-medium">Fresh finds from verified local rotations.</p>
                    </div>
                    <Link href="/browse" className="group hidden md:flex text-sm font-black tracking-widest uppercase text-primary hover:text-orange-400 items-center transition-all bg-primary/10 px-6 py-3 rounded-full hover:bg-primary/20">
                        View Full Roster <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>

                <ProductGrid products={products} />

                <Link href="/browse" className="mt-12 md:hidden group text-sm font-black tracking-widest uppercase text-primary hover:text-orange-400 flex justify-center items-center transition-all bg-primary/10 px-6 py-4 rounded-full hover:bg-primary/20 w-full text-center">
                    View Full Roster <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
            </div>
        </section>
    );
}
