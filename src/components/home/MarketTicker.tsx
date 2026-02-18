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
        <div className="w-full bg-slate-900 text-white py-2 overflow-hidden border-y border-white/5 relative z-50">
            <div className="flex animate-marquee whitespace-nowrap hover:[animation-play-state:paused]">
                {[...items, ...items].map((item, i) => (
                    <Link 
                        key={`${item.id}-${i}`} 
                        href={`/product/${item.id}`}
                        className="flex items-center gap-4 px-8 border-r border-white/10 hover:bg-white/5 transition-colors group"
                    >
                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary group-hover:text-white transition-colors">
                            <TrendingUp className="h-3 w-3" />
                            {item.category === 'Trading Cards' ? 'New Box' : 'New Kick'}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-tight group-hover:underline underline-offset-4 decoration-primary">
                            {item.title}
                        </span>
                        <span className="text-xs font-black text-primary">${item.price}</span>
                        <span className="text-[10px] text-white/40 font-medium">Live</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
