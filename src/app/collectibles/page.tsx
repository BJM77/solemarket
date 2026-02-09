
'use client';
import { Suspense, useMemo } from 'react';
import { PageHeader } from "@/components/layout/PageHeader";
import MontageGrid from "@/components/products/MontageGrid";
import ProductGridSkeleton from '@/components/products/ProductGridSkeleton';
import { Product } from '@/lib/types';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';

const COLLECTIBLES_CATEGORIES = ['Collectibles', 'Stamps', 'Comics', 'Figurines', 'Toys', 'Shoes', 'Memorabilia', 'General'];

export default function CollectiblesPage() {
    const { firestore } = useFirebase();

    const productsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'products'),
            where('category', 'in', COLLECTIBLES_CATEGORIES),
            where('isDraft', '==', false),
            orderBy('createdAt', 'desc'),
            limit(100));
    }, [firestore]);

    const { data: products, isLoading } = useCollection<Product>(productsQuery);

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-8">
                <PageHeader
                    title="General"

                    description="A wide array of treasures from various categories."
                />
            </div>
            <Suspense fallback={<div className="container mx-auto px-4"><ProductGridSkeleton count={20} /></div>}>
                {isLoading ? <div className="container mx-auto px-4"><ProductGridSkeleton count={20} /></div> : <MontageGrid products={products || []} />}
            </Suspense>
        </div>
    );
}

