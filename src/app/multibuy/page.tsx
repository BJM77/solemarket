import { BundleShowcase } from '@/components/bundles/BundleShowcase';
import { getBundleListings, getPublicBundles } from '@/app/actions/marketplace/bundle-actions';
import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import { getProducts } from '@/services/product-service';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTierSettings } from '@/app/actions/marketplace/tier-actions';
import { BUNDLE_TIERS, TIER_LABEL, TIER_GROUPS, isBundleTier, multibuyFilterState, tierOfferText, type BundleTier, type TierGroup } from '@/lib/tier-bundles';
import { X } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Multibuy Deals',
    description: 'Shop items with bulk discounts. Buy more, save more on sneakers, trading cards and collectibles.',
    alternates: {
        canonical: '/multibuy',
    },
    openGraph: {
        title: 'Multibuy Deals',
        description: 'Shop items with bulk discounts. Buy more, save more.',
        type: 'website',
    },
};

function firstString(v: string | string[] | undefined): string {
    return typeof v === 'string' ? v : '';
}

function isTierGroup(v: unknown): v is TierGroup {
    return v === 'cards' || v === 'coins';
}

function multibuyHref(opts: {
    tier?: BundleTier;
    sellerId?: string;
    sellerName?: string;
    group?: TierGroup;
    q?: string;
    category?: string;
    sort?: string;
}): string {
    const params = new URLSearchParams();
    if (opts.tier) params.set('tier', opts.tier);
    if (opts.sellerId) params.set('seller', opts.sellerId);
    if (opts.sellerId && opts.sellerName) params.set('sellerName', opts.sellerName);
    if (opts.group) params.set('group', opts.group);
    if (opts.q) params.set('q', opts.q);
    if (opts.category) params.set('category', opts.category);
    if (opts.sort) params.set('sort', opts.sort);
    const qs = params.toString();
    return qs ? `/multibuy?${qs}` : '/multibuy';
}

export default async function MultibuyPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const resolvedParams = await searchParams;
    const searchTerm = firstString(resolvedParams.q);
    const tier = isBundleTier(resolvedParams.tier) ? resolvedParams.tier : undefined;
    const sellerId = firstString(resolvedParams.seller) || firstString(resolvedParams.sellerId) || undefined;
    const sellerName = firstString(resolvedParams.sellerName) || undefined;
    const group = isTierGroup(resolvedParams.group) ? resolvedParams.group : undefined;
    const category = firstString(resolvedParams.category) || undefined;
    const sort = firstString(resolvedParams.sort) || undefined;
    const tierSettings = await getTierSettings();

    const shared = { q: searchTerm, category, sellerId, sellerName, group };

    // Initial Server Fetch
    let initialProductsData;
    try {
        initialProductsData = await getProducts({
            q: searchTerm,
            category,
            sort,
            page: 1,
            limit: 24,
            ...multibuyFilterState(tier),
            ...(sellerId ? { sellers: [sellerId] } : {}),
            ...(group ? { tierGroup: group } : {}),
            // A seller-filtered deal list should include every card (or coin) that
            // counts toward that deal, including TCG listings hidden on the main feed.
            ...(sellerId && group !== 'coins' ? { includePokemon: true } : {}),
            ...(sellerId && group !== 'cards' ? { includeCoins: true } : {}),
        } as any);
    } catch (error) {
        console.error("Initial fetch failed:", error);
        initialProductsData = undefined;
    }

    const resolvedSellerName = sellerName
        || (initialProductsData?.products || []).find((p: any) => p.sellerId === sellerId)?.sellerName
        || undefined;

    const bundleId = typeof resolvedParams.bundle === 'string' ? resolvedParams.bundle : undefined;
    const [bundles, selected] = await Promise.all([
        getPublicBundles(24),
        bundleId ? getBundleListings(bundleId) : Promise.resolve(null),
    ]);

    const pageTitle = [
        tier ? `${TIER_LABEL[tier]}` : null,
        group ? (group === 'coins' ? 'coin' : 'card') : null,
        'Bundle Deals',
        resolvedSellerName ? `from ${resolvedSellerName}` : sellerId ? 'from this seller' : null,
    ].filter(Boolean).join(' ') || 'Multibuy Deals';

    return (
        <>
        {tierSettings.enabled && (
        <section className="max-w-7xl mx-auto px-4 pt-6" aria-labelledby="tier-heading" data-testid="multibuy-tiers">
            <h2 id="tier-heading" className="text-lg font-black uppercase tracking-tight">Bronze, Silver &amp; Gold bundles</h2>
            <p className="text-xs text-muted-foreground mb-3">Mix any cards in the same tier from the same seller. The bundle price applies automatically in your cart.</p>
            <div className="flex flex-wrap gap-2">
                <Link href={multibuyHref(shared)} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${!tier ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>All deals</Link>
                {BUNDLE_TIERS.map(t => (
                    <Link key={t} href={multibuyHref({ ...shared, tier: t })} aria-current={tier === t ? 'page' : undefined}
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold ${tier === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                        {TIER_LABEL[t]}: {tierOfferText(tierSettings.cards[t])}
                    </Link>
                ))}
            </div>
            {sellerId && (
                <div className="mt-3 flex flex-wrap items-center gap-2" data-testid="multibuy-seller-filter">
                    <p className="text-sm font-semibold">
                        Showing {tier ? `${TIER_LABEL[tier]} ` : ''}{group ? (group === 'coins' ? 'coin' : 'card') + ' ' : ''}deals from {resolvedSellerName || 'this seller'}
                    </p>
                    <Link
                        href={multibuyHref({ ...shared, sellerId: undefined, sellerName: undefined })}
                        data-testid="multibuy-seller-clear"
                        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold hover:bg-muted"
                    >
                        <X className="h-3 w-3" aria-hidden />
                        Clear seller
                    </Link>
                </div>
            )}
            {group && (
                <div className="mt-2 flex flex-wrap gap-2" data-testid="multibuy-group-filter">
                    {TIER_GROUPS.map((g) => (
                        <Link
                            key={g}
                            href={multibuyHref({ ...shared, tier, group: g })}
                            className={`rounded-full border px-3 py-1 text-[11px] font-bold ${group === g ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                        >
                            {g === 'cards' ? 'Cards' : 'Coins'}
                        </Link>
                    ))}
                    <Link
                        href={multibuyHref({ ...shared, tier, group: undefined })}
                        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold hover:bg-muted"
                    >
                        <X className="h-3 w-3" aria-hidden />
                        Clear {group === 'coins' ? 'coins' : 'cards'} filter
                    </Link>
                </div>
            )}
        </section>
        )}
        <BundleShowcase bundles={bundles} selected={selected?.bundle} products={selected?.products as any} />
        <InfiniteProductGrid
            pageTitle={tier || sellerId ? pageTitle : "Multibuy Deals"}
            pageDescription="Buy more, save more! Volume discounts apply automatically in your cart."
            initialFilterState={{
                q: searchTerm,
                category,
                ...multibuyFilterState(tier),
                ...(sellerId ? { sellers: [sellerId], sellerName: resolvedSellerName } : {}),
                ...(group ? { tierGroup: group } : {}),
                ...(sellerId && group !== 'coins' ? { includePokemon: true } : {}),
                ...(sellerId && group !== 'cards' ? { includeCoins: true } : {}),
            } as any}
            initialData={initialProductsData}
        />
        </>
    );
}
