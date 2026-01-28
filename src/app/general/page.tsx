
'use client';
import { Suspense } from 'react';
import { PageHeader } from "@/components/layout/PageHeader";
import MontageGrid from "@/components/products/MontageGrid";
import ProductGridSkeleton from '@/components/products/ProductGridSkeleton';
import { Product } from '@/lib/types';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';

export default function GeneralPage() {
    const { firestore } = useFirebase();

    const productsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'products'),
            where('category', '==', 'General'),
            where('isDraft', '==', false),
            orderBy('createdAt', 'desc'),
            limit(100)
        );
    }, [firestore]);

    const { data: products, isLoading } = useCollection<Product>(productsQuery);

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-8">
                <PageHeader
                    title="General Listings"
                    description="Everything else. Second-hand treasures and general items."
                />
            </div>
            <Suspense fallback={<div className="container mx-auto px-4"><ProductGridSkeleton count={20} /></div>}>
                {isLoading ? <div className="container mx-auto px-4"><ProductGridSkeleton count={20} /></div> : <MontageGrid products={products || []} />}
            </Suspense>
        </div>
    );
}
