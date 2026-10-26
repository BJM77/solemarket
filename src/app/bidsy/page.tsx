import type { Metadata } from 'next';
import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import { getProducts } from '@/services/product-service';

export const metadata: Metadata = {
  title: 'Bidsy: Make an Offer on Unpriced Items',
  description: 'Bidsy on Benched: sneakers, trading cards and coins listed without a fixed price. Make the seller an offer.',
  alternates: { canonical: '/bidsy' },
};

export default async function UntimedPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const resolvedParams = await searchParams;
    const searchTerm = typeof resolvedParams.q === 'string' ? resolvedParams.q : '';

    // Initial Server Fetch with isUntimed=true
    let initialProductsData;
    try {
        initialProductsData = await getProducts({
            q: searchTerm,
            category: typeof resolvedParams.category === 'string' ? resolvedParams.category : undefined,
            sort: typeof resolvedParams.sort === 'string' ? resolvedParams.sort : undefined,
            page: 1,
            limit: 24,
            isUntimed: true // Force untimed
        });
    } catch (error) {
        console.error("Initial fetch failed:", error);
        initialProductsData = undefined;
    }

    return (
        <InfiniteProductGrid
            pageTitle="Bidsy"
            titleAsH1
            pageDescription="Make an offer on these exclusive, unpriced items."
            initialFilterState={{
                q: searchTerm,
                category: typeof resolvedParams.category === 'string' ? resolvedParams.category : undefined,
                isUntimed: true // Ensure client-side keeps this filter
            }}
            initialData={initialProductsData}
        />
    );
}
