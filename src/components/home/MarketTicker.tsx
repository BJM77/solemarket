'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Product } from '@/lib/types';

export function MarketTicker() {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const tickerQuery = useMemoFirebase(() => {
        if (!db) return null;
        return query(
            collection(db, 'products'),
            where('status', '==', 'available'),
            orderBy('isFeatured', 'desc'),
            orderBy('createdAt', 'desc'),
            limit(10)
        );
    }, []);

    const { data: products, isLoading } = useCollection<Product>(tickerQuery);

    if (!isClient) return null;

    // If no products and not loading, show a blank bar
    if (!isLoading && (!products || products.length === 0)) {
        return (
            <div className="w-full bg-slate-950 h-10 border-y border-white/5 relative z-50">
                {/* Blank bar state as requested when no listings exist */}
            </div>
        );
    }

    // Prepare data for the marquee
    const items = products || [];

    return (
        <div className="bg-primary text-white py-4 overflow-hidden border-y-2 border-primary/20 relative z-30">
            <div className="flex animate-marquee whitespace-nowrap hover:[animation-play-state:paused] items-center gap-8 text-sm font-bold tracking-widest uppercase">
                {[...items, ...items, ...items].map((item, i) => (
                    <Link
                        key={`${item.id}-${i}`}
                        href={`/product/${item.id}`}
                        className="flex items-center gap-3 hover:text-white/80 transition-colors group"
                    >
                        <span className="flex items-center gap-1 opacity-80">
                            <TrendingUp className="h-4 w-4" />
                            {item.category === 'Trading Cards' ? 'NEW BOX' : 'NEW KICK'}
                        </span>
                        <span>•</span>
                        <span className="group-hover:underline underline-offset-4">
                            {item.title}
                        </span>
                        <span className="text-black bg-white/20 px-2 py-0.5 rounded-sm">${item.price}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
