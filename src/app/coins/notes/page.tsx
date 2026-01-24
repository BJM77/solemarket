
'use client';
import { Suspense, useMemo } from 'react';
import { PageHeader } from "@/components/layout/PageHeader";
import MontageGrid from "@/components/products/MontageGrid";
import ProductGridSkeleton from '@/components/products/ProductGridSkeleton';
import type { Product } from '@/lib/types';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';


export default function NotesPage() {
    const { firestore } = useFirebase();
    const productsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'products'), where('category', '==', 'Coins'), orderBy('createdAt', 'desc'), limit(100));
    }, [firestore]);

    const { data: products, isLoading } = useCollection<Product>(productsQuery);
    
    const filteredProducts = useMemo(() => {
        if (!products) return [];
        return products.filter(p => 
            (typeof p.title === 'string' && p.title.toLowerCase().includes('note')) || 
            (typeof p.description === 'string' && p.description.toLowerCase().includes('note'))
        ) || [];
    }, [products]);

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-8">
                <PageHeader
                    title="Collectible Banknotes"
                    description="Explore rare and historical banknotes from around the world."
                />
            </div>
            <Suspense fallback={<div className="container mx-auto px-4"><ProductGridSkeleton count={20} /></div>}>
                {isLoading ? <div className="container mx-auto px-4"><ProductGridSkeleton count={20} /></div> : <MontageGrid products={filteredProducts} />}
            </Suspense>
        </div>
    );
}
