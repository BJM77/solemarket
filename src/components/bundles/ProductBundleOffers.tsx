'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package } from 'lucide-react';
import type { Product } from '@/lib/types';
import type { FixedPriceBundle } from '@/types/bundles';
import { getBundlesForProduct } from '@/app/actions/marketplace/bundle-actions';
import { bundleProgress, formatBundleOffer } from '@/lib/bundles';
import { cartItemsToLines } from '@/lib/order-pricing';
import { useCart } from '@/context/CartContext';

/** "5 for $20" badge + "Add 2 more" progress on the product page. */
export function ProductBundleOffers({ product }: { product: Pick<Product, 'id'> }) {
    const [bundles, setBundles] = useState<FixedPriceBundle[]>([]);
    const { items } = useCart();

    useEffect(() => {
        let cancelled = false;
        getBundlesForProduct(product.id).then(b => { if (!cancelled) setBundles(b); }).catch(() => {});
        return () => { cancelled = true; };
    }, [product.id]);

    if (!bundles.length) return null;
    const lines = cartItemsToLines(items as any);

    return (
        <div className="mt-4 space-y-2" data-testid="product-bundle-offers">
            {bundles.map(b => {
                const p = bundleProgress(b, lines);
                const inCart = p.eligibleInCart > 0;
                return (
                    <div key={b.id} className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                        <Package className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                        <div className="min-w-0 text-sm">
                            <p className="font-black text-emerald-700 dark:text-emerald-400">
                                Bundle deal: {formatBundleOffer(b)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {b.name}. Mix and match eligible items from this seller.
                                {inCart ? ` ${p.label}.` : ''}
                            </p>
                            <Link href={`/multibuy?bundle=${encodeURIComponent(b.id)}`} className="text-xs font-bold underline">
                                See eligible items
                            </Link>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
