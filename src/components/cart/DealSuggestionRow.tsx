'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getDealSuggestionsAction } from '@/app/actions/marketplace/deal-suggestions';
import { useCart } from '@/context/CartContext';
import { useUser } from '@/firebase';
import { formatPrice } from '@/lib/utils/format';
import { getProductUrl } from '@/lib/utils/url';
import { SUGGESTION_MAX, selectDealSuggestions } from '@/lib/tier-suggestions';
import type { TierNudge } from '@/lib/tier-bundles';
import type { Product } from '@/lib/types';

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { at: number; products: Product[] }>();

function cacheKey(nudge: TierNudge, buyerId?: string | null) {
    return `${nudge.sellerId}::${nudge.group}::${nudge.tier}::${buyerId || ''}`;
}

/** Compact horizontal row of matching listings a buyer can add to finish this deal. */
export function DealSuggestionRow({ nudge }: { nudge: TierNudge }) {
    const { items, addItem } = useCart();
    const { user } = useUser();
    const buyerId = user?.uid || null;
    const excludeIds = useMemo(() => items.map((i) => i.id), [items]);
    const { sellerId, group, tier, remaining } = nudge;
    const [pool, setPool] = useState<Product[]>([]);
    const [status, setStatus] = useState<'idle' | 'loading' | 'ready'>('idle');
    const requestId = useRef(0);

    useEffect(() => {
        if (remaining <= 0) return;
        const key = cacheKey(nudge, buyerId);
        const hit = cache.get(key);
        if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
            setPool(hit.products);
            setStatus('ready');
            return;
        }

        setStatus('loading');
        const id = ++requestId.current;
        const timer = window.setTimeout(() => {
            getDealSuggestionsAction({
                sellerId,
                tier,
                group,
                // Ask for a full shortlist; the client then drops items already in the cart.
                remaining: SUGGESTION_MAX,
                excludeIds: [],
                buyerId,
            })
                .then((products) => {
                    if (id !== requestId.current) return;
                    cache.set(key, { at: Date.now(), products });
                    setPool(products);
                    setStatus('ready');
                })
                .catch(() => {
                    if (id !== requestId.current) return;
                    setPool([]);
                    setStatus('ready');
                });
        }, 200);

        return () => {
            window.clearTimeout(timer);
        };
    }, [sellerId, group, tier, remaining, buyerId, nudge]);

    const suggestions = useMemo(
        () => selectDealSuggestions(pool, {
            sellerId,
            tier,
            group,
            remaining,
            excludeIds,
            buyerId,
        }),
        [pool, sellerId, group, tier, remaining, excludeIds, buyerId],
    );

    if (remaining <= 0) return null;
    if (status !== 'ready' || suggestions.length === 0) return null;

    return (
        <div className="mt-2" data-testid="deal-suggestion-row">
            <p className="text-[11px] font-semibold opacity-80 mb-1.5">
                Add one of these to fill the deal
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5 snap-x snap-mandatory [scrollbar-width:thin]">
                {suggestions.map((product) => {
                    const image = product.imageUrls?.[0] || '/placeholder.png';
                    return (
                        <div
                            key={product.id}
                            data-testid="deal-suggestion-card"
                            className="snap-start shrink-0 w-[7.25rem] rounded-lg border border-border/80 bg-background/80 overflow-hidden"
                        >
                            <Link href={getProductUrl(product)} className="block">
                                <div className="relative aspect-square bg-muted">
                                    <Image
                                        src={image}
                                        alt={product.title}
                                        fill
                                        className="object-cover"
                                        sizes="116px"
                                    />
                                </div>
                                <p className="px-1.5 pt-1.5 text-[11px] font-semibold leading-tight line-clamp-2 text-foreground">
                                    {product.title}
                                </p>
                            </Link>
                            <div className="px-1.5 pb-1.5 pt-1 flex items-center justify-between gap-1">
                                <span className="text-[11px] font-black text-foreground">
                                    ${formatPrice(product.price)}
                                </span>
                                <button
                                    type="button"
                                    data-testid="deal-suggestion-add"
                                    className="h-6 px-2 rounded-md bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wide shrink-0"
                                    onClick={() => addItem(product, 1)}
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
