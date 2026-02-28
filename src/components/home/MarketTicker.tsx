'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Product } from '@/lib/types';
import { getProductUrl } from '@/lib/utils';
import { useMobileNav } from '@/context/MobileNavContext';

export function MarketTicker({ compact = false }: { compact?: boolean }) {
    const [isClient, setIsClient] = useState(false);
    const { isPinned } = useMobileNav();

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
            <div className={cn("w-full bg-slate-950 border-white/5 relative z-50", compact ? "h-full border-0" : "h-5 md:h-10 border-y")}>
                {/* Blank bar state as requested when no listings exist */}
            </div>
        );
    }

    // Prepare data for the marquee
    const items = products || [];

    return (
        <div className={cn(
            "bg-primary text-black overflow-hidden relative z-30",
            compact
                ? "py-0 h-full w-full flex items-center rounded-lg shadow-inner"
                : "py-1 md:py-1.5 border-y-2 border-primary/20 w-4/5 mx-auto rounded-full my-1 md:my-2 shadow-sm",
            !compact && isPinned ? "hidden md:block" : ""
        )}>
            <div className={cn(
                "flex animate-marquee whitespace-nowrap hover:[animation-play-state:paused] items-center font-black tracking-widest uppercase",
                compact ? "gap-4 text-[10px] sm:text-xs h-full" : "gap-4 md:gap-6 text-xs md:text-sm"
            )}>
                {[...items, ...items, ...items].map((item, i) => (
                    <Link
                        key={`${item.id}-${i}`}
                        href={getProductUrl(item)}
                        className="flex items-center gap-2 md:gap-3 hover:text-black/70 transition-colors group"
                    >
                        <span className="flex items-center gap-1 opacity-90">
                            <TrendingUp className={cn(compact ? "h-3 w-3" : "h-3 w-3 md:h-4 md:w-4")} />
                            {item.category === 'Collector Cards' || item.category === 'Trading Cards' ? 'NEW BOX' : 'NEW KICK'}
                        </span>
                        <span>•</span>
                        <span className="group-hover:underline underline-offset-4">
                            {item.title}
                        </span>
                        <span className="text-white bg-black/90 px-1.5 md:px-2 py-0.5 rounded-sm">${item.price}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
