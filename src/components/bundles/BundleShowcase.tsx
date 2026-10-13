'use client';

import Link from 'next/link';
import { Package, X } from 'lucide-react';
import type { FixedPriceBundle } from '@/types/bundles';
import type { Product } from '@/lib/types';
import { formatBundleOffer } from '@/lib/bundles';
import ProductCard from '@/components/products/ProductCard';

/** Fixed-price bundles strip on /multibuy, plus the eligible items when one is selected. */
export function BundleShowcase({ bundles, selected, products }: {
    bundles: FixedPriceBundle[];
    selected?: FixedPriceBundle | null;
    products?: Product[];
}) {
    if (!bundles.length && !selected) return null;
    return (
        <section aria-labelledby="bundle-deals-heading" className="container mx-auto px-4 pt-6" data-testid="bundle-showcase">
            <h2 id="bundle-deals-heading" className="mb-3 text-xl font-black tracking-tight">Fixed-price bundles</h2>
            <p className="mb-4 text-sm text-muted-foreground">
                Mix and match eligible items from one seller. The bundle price is applied automatically in your cart.
            </p>
            {selected ? (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                        <div>
                            <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">{formatBundleOffer(selected)}: {selected.name}</p>
                            {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}
                            {selected.sellerName && <p className="text-xs text-muted-foreground">Sold by {selected.sellerName}</p>}
                        </div>
                        <Link href="/multibuy" className="inline-flex min-h-11 items-center gap-1 rounded-full border px-4 text-sm font-bold">
                            <X className="h-4 w-4" aria-hidden /> All bundles
                        </Link>
                    </div>
                    {products && products.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                            {products.map(p => <ProductCard key={p.id} product={p} />)}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No eligible items are available right now.</p>
                    )}
                </div>
            ) : (
                <ul className="flex snap-x gap-3 overflow-x-auto pb-2">
                    {bundles.map(b => (
                        <li key={b.id} className="w-64 shrink-0 snap-start">
                            <Link href={`/multibuy?bundle=${encodeURIComponent(b.id)}`}
                                className="flex h-full min-h-24 flex-col justify-between rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 p-4 hover:border-emerald-500">
                                <span className="flex items-center gap-2 text-lg font-black text-emerald-700 dark:text-emerald-400">
                                    <Package className="h-5 w-5" aria-hidden /> {formatBundleOffer(b)}
                                </span>
                                <span className="text-sm font-semibold">{b.name}</span>
                                {b.sellerName && <span className="text-xs text-muted-foreground">{b.sellerName}</span>}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
