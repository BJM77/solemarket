'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from "@/components/layout/PageHeader";
import ProductGrid from "@/components/products/ProductGrid";
import ProductList from '@/components/products/ProductList';
import ProductViewSwitcher from '@/components/products/ProductViewSwitcher';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import ProductGridSkeleton from '@/components/products/ProductGridSkeleton';
import MontageGrid from '@/components/products/MontageGrid';

export default function DealsPage() {
    const [view, setView] = useState<'grid' | 'list' | 'montage'>('grid');
    const { firestore } = useFirebase() || {};

    const productsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, "products"), orderBy("createdAt", "desc"), limit(50));
    }, [firestore]);

    const { data: products, isLoading } = useCollection<Product>(productsQuery);

    return (
        <div className="container py-8">
            <div className="flex justify-between items-center mb-8">
                <PageHeader
                    title="Hot Deals"
                    description="Check out the latest sales and special offers from our sellers."
                />
                <ProductViewSwitcher view={view} setView={setView} />
            </div>

            {isLoading ? (
                <ProductGridSkeleton count={8} />
            ) : view === 'grid' ? (
                <ProductGrid products={products || []} />
            ) : view === 'list' ? (
                <ProductList products={products || []} />
            ) : (
                <MontageGrid products={products || []} />
            )}
        </div>
    );
}
