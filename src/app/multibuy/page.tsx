import { BundleShowcase } from '@/components/bundles/BundleShowcase';
import { getBundleListings, getPublicBundles } from '@/app/actions/marketplace/bundle-actions';
import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import { getProducts } from '@/services/product-service';
import type { Metadata } from 'next';

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

    // Initial Server Fetch
    let initialProductsData;
    try {
        initialProductsData = await getProducts({
            q: searchTerm,
            category: typeof resolvedParams.category === 'string' ? resolvedParams.category : undefined,
            sort: typeof resolvedParams.sort === 'string' ? resolvedParams.sort : undefined,
            page: 1,
            limit: 24,
            multibuyEnabled: true // FORCE MULTIBUY ITEMS ONLY
        });
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
        <BundleShowcase bundles={bundles} selected={selected?.bundle} products={selected?.products as any} />
        <InfiniteProductGrid
            pageTitle="Multibuy Deals"
            pageDescription="Buy more, save more! Volume discounts apply automatically in your cart."
            initialFilterState={{
                q: searchTerm,
                category: typeof resolvedParams.category === 'string' ? resolvedParams.category : undefined,
                multibuyEnabled: true // Pass this to client component if it supports it
            }}
            initialData={initialProductsData}
        />
        </>
    );
}
