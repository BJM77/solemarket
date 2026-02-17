import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import { getProducts } from '@/services/product-service';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Multibuy Deals | Benched',
    description: 'Shop items with bulk discounts. Buy more, save more on sneakers and streetwear.',
    openGraph: {
        title: 'Multibuy Deals | Benched',
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

    return (
        <InfiniteProductGrid
            pageTitle="Multibuy Deals"
            pageDescription="Buy more, save more! Bulk discounts available on all items below."
            initialFilterState={{
                q: searchTerm,
                category: typeof resolvedParams.category === 'string' ? resolvedParams.category : undefined,
                multibuyEnabled: true // Pass this to client component if it supports it
            }}
            initialData={initialProductsData}
        />
    );
}
