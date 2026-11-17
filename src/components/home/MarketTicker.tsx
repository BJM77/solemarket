'use client';

import { useEffect, useState } from 'react';
import { cn } from "@/lib/utils/ui";
import { TrendingUp, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirebaseRef } from '@/firebase';
import type { Product } from '@/lib/types';
import { getProductUrl } from "@/lib/utils/url";
import { isPokemonListing } from '@/lib/pokemon-listings';
import { isCoinListing } from '@/lib/coin-listings';
import { useMobileNav } from '@/context/MobileNavContext';
import { MARKET_TICKER_THEME_CLASSES, marketTickerSurfaceClass } from '@/components/home/market-ticker-theme';

export function MarketTicker({ compact = false }: { compact?: boolean }) {
    const [isClient, setIsClient] = useState(false);
    const { isPinned } = useMobileNav();

    useEffect(() => {
        setIsClient(true);
    }, []);

    const tickerQuery = useFirebaseRef(({ db, fs: { query, collection, where, orderBy, limit } }) => {
        return query(
            collection(db, 'products'),
            where('status', '==', 'available'),
            orderBy('createdAt', 'desc'),
            limit(25)
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
                marketTickerSurfaceClass({ compact, waiting: true }),
                !compact && isPinned ? "hidden md:block" : ""
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
    const items = (products || []).filter(item => item && item.id && !isPokemonListing(item) && !isCoinListing(item)).slice(0, 10);

    if (items.length === 0) return null;

    // Use a smaller duplication for better performance if items are few
    const displayItems = items.length < 5 ? [...items, ...items, ...items, ...items] : [...items, ...items, ...items];

    return (
        <div
            data-testid="market-ticker"
            className={cn(
                marketTickerSurfaceClass({ compact }),
                !compact && isPinned ? "hidden md:block" : ""
            )}
        >
            <div className={cn(
                "flex animate-marquee whitespace-nowrap hover:[animation-play-state:paused] items-center font-bold tracking-widest uppercase",
                compact ? "gap-4 text-[10px] sm:text-xs h-full" : "gap-4 md:gap-6 text-xs md:text-sm"
            )}>
                {displayItems.map((item, i) => {
                    if (!item) return null;
                    const url = getProductUrl(item);
                    return (
                        <Link
                            key={`${item.id}-${i}`}
                            href={url}
                            className="flex items-center gap-2 md:gap-3 text-primary-foreground hover:text-primary-foreground/80 transition-colors group"
                        >
                            <span className="flex items-center gap-1 opacity-90">
                                {TrendingUp && <TrendingUp className={cn(compact ? "h-3 w-3" : "h-3 w-3 md:h-4 md:w-4")} />}
                            </span>
                            <span className="group-hover:underline underline-offset-4">
                                {item.title || 'Product'}
                            </span>
                            <span className={cn("px-1.5 md:px-2 py-0.5", MARKET_TICKER_THEME_CLASSES.badge)}>
                                ${item.price || '0.00'}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
