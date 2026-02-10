import { Suspense } from 'react';
import { PageHeader } from "@/components/layout/PageHeader";
import ProductGrid from "@/components/products/ProductGrid";
import ProductGridSkeleton from '@/components/products/ProductGridSkeleton';
import { getCollectiblesProducts } from '@/app/actions/products';
import TrustBar from '@/components/trust/TrustBar';
import CategoryRail from '@/components/home/CategoryRail';

export const revalidate = 60;

export default async function CollectiblesPage() {
    const products = await getCollectiblesProducts(20);

    return (
        <main className="min-h-screen bg-gray-50/50 dark:bg-black/50">
            <CategoryRail />

            <div className="container mx-auto px-4 py-8">
                <PageHeader
                    title="Collectibles"
                    description="A wide array of treasures from various categories."
                />

                <Suspense fallback={<ProductGridSkeleton count={8} />}>
                    <ProductGrid products={products} />
                </Suspense>
            </div>

            <div className="mt-20">
                <TrustBar />
            </div>
        </main>
    );
}

