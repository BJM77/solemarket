import { BundleShowcase } from '@/components/bundles/BundleShowcase';
import { getBundleListings, getPublicBundles } from '@/app/actions/marketplace/bundle-actions';
import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import { getProducts } from '@/services/product-service';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTierSettings } from '@/app/actions/marketplace/tier-actions';
import { BUNDLE_TIERS, TIER_LABEL, isBundleTier, tierOfferText } from '@/lib/tier-bundles';

export const metadata: Metadata = {
    title: 'Multibuy Deals',
    description: 'Shop items with bulk discounts. Buy more, save more on sneakers and streetwear.',
    openGraph: {
        title: 'Multibuy Deals',
        description: 'Shop items with bulk discounts. Buy more, save more.',
        type: 'website',
    },
};

export default async function MultibuyPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const resolvedParams = await searchParams;
    const searchTerm = typeof resolvedParams.q === 'string' ? resolvedParams.q : '';
    const tier = isBundleTier(resolvedParams.tier) ? resolvedParams.tier : undefined;
    const tierSettings = await getTierSettings();

    // Initial Server Fetch
    let initialProductsData;
    try {
        initialProductsData = await getProducts({
            q: searchTerm,
            category: typeof resolvedParams.category === 'string' ? resolvedParams.category : undefined,
            sort: typeof resolvedParams.sort === 'string' ? resolvedParams.sort : undefined,
            page: 1,
            limit: 24,
            multibuyEnabled: true, // FORCE MULTIBUY ITEMS ONLY
            ...(tier ? { multiCardTiers: [tier] } : {}),
        } as any);
    } catch (error) {
        console.error("Initial fetch failed:", error);
        initialProductsData = undefined;
    }

    const bundleId = typeof resolvedParams.bundle === 'string' ? resolvedParams.bundle : undefined;
    const [bundles, selected] = await Promise.all([
        getPublicBundles(24),
        bundleId ? getBundleListings(bundleId) : Promise.resolve(null),
    ]);

    return (
        <>
        {tierSettings.enabled && (
        <section className="max-w-7xl mx-auto px-4 pt-6" aria-labelledby="tier-heading" data-testid="multibuy-tiers">
            <h2 id="tier-heading" className="text-lg font-black uppercase tracking-tight">Bronze, Silver &amp; Gold bundles</h2>
            <p className="text-xs text-muted-foreground mb-3">Mix any items in the same tier from the same seller. Card tiers count cards only; coin tiers count coins only. The bundle price applies automatically in your cart.</p>
            <div className="flex flex-wrap gap-2">
                <Link href="/multibuy" className={`rounded-full border px-3 py-1.5 text-xs font-bold ${!tier ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>All deals</Link>
                {BUNDLE_TIERS.map(t => (
                    <Link key={t} href={`/multibuy?tier=${t}`} aria-current={tier === t ? 'page' : undefined}
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold ${tier === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                        {TIER_LABEL[t]}: cards {tierOfferText(tierSettings.cards[t])} · coins {tierOfferText(tierSettings.coins[t])}
                    </Link>
                ))}
            </div>
        </section>
        )}
        <BundleShowcase bundles={bundles} selected={selected?.bundle} products={selected?.products as any} />
        <InfiniteProductGrid
            pageTitle={tier ? `${TIER_LABEL[tier]} Bundle Deals` : "Multibuy Deals"}
            pageDescription="Buy more, save more! Volume discounts apply automatically in your cart."
            initialFilterState={{
                q: searchTerm,
                category: typeof resolvedParams.category === 'string' ? resolvedParams.category : undefined,
                multibuyEnabled: true, // Pass this to client component if it supports it
                ...(tier ? { multiCardTiers: [tier] } : {}),
            } as any}
            initialData={initialProductsData}
        />
        </>
    );
}
