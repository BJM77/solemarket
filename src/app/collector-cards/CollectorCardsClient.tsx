'use client';

import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';

export default function CollectorCardsClient({ pageTitle, pageDescription, subCategory, category }: { pageTitle: string, pageDescription?: string, subCategory?: string, category?: string }) {
    return (
        <InfiniteProductGrid 
            pageTitle={pageTitle}
            pageDescription={pageDescription}
            initialFilterState={{
                category: category,
                subCategory: subCategory,
            }}
        />
    )
}
