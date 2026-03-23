'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, RefreshCw } from 'lucide-react';
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
            orderBy('createdAt', 'desc'),
            limit(10)
        );
    }, []);

    const { data: products, isLoading, error } = useCollection<Product>(tickerQuery);

    useEffect(() => {
        if (products) {
            console.log(`[MarketTicker] Loaded ${products.length} products`);
        }
    }, [products]);

    if (!isClient) return null;

    // Handle Error or Empty State
    if (!isLoading && (!products || products.length === 0)) {
        return (
            <div className={cn(
                "bg-zinc-900 text-white/80 overflow-hidden relative z-30 flex items-center justify-center gap-3",
                compact
                    ? "py-0 h-full w-full rounded-lg"
                    : "py-1.5 border-y border-white/5 w-full md:w-4/5 mx-auto rounded-full my-2 shadow-sm"
            )}>
                <RefreshCw className="h-3 w-3 animate-spin opacity-40" />
                <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] opacity-40 animate-pulse">
                    {error?.message?.includes('index') ? "Bench Warming (Indexing)..." : "Waiting for active listings..."}
                </p>
                {error && (
                    <span className="hidden">{error.message}</span>
                )}
            </div>
        );
    }

    // Prepare data for the marquee, ensure stability and no null items
    const items = (products || []).filter(item => item && item.id);

    if (items.length === 0) return null;

    // Use a smaller duplication for better performance if items are few
    const displayItems = items.length < 5 ? [...items, ...items, ...items, ...items] : [...items, ...items, ...items];

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
                {displayItems.map((item, i) => {
                    if (!item) return null;
                    const url = getProductUrl(item);
                    return (
                        <Link
                            key={`${item.id}-${i}`}
                            href={url}
                            className="flex items-center gap-2 md:gap-3 hover:text-black/70 transition-colors group"
                        >
                            <span className="flex items-center gap-1 opacity-90">
                                {TrendingUp && <TrendingUp className={cn(compact ? "h-3 w-3" : "h-3 w-3 md:h-4 md:w-4")} />}
                            </span>
                            <span className="group-hover:underline underline-offset-4">
                                {item.title || 'Product'}
                            </span>
                            <span className="text-white bg-black/90 px-1.5 md:px-2 py-0.5 rounded-sm">
                                ${item.price || '0.00'}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
