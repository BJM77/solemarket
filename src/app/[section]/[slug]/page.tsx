
'use client';
import { useState, useEffect, Suspense, useMemo } from 'react';
import { PageHeader } from "@/components/layout/PageHeader";
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { useParams } from 'next/navigation';
import MontageGrid from '@/components/products/MontageGrid';
import ProductGridSkeleton from '@/components/products/ProductGridSkeleton';

function toTitleCase(str: string) {
    if (!str) return '';
    return str.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function CategoryPageContent() {
    const params = useParams();
    const section = params.section as string;
    const slug = params.slug as string;

    const { firestore } = useFirebase() || {};
    
    const categoryName = toTitleCase(slug);

    // Query by both category and subCategory for efficiency
    const productsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, "products"),
            where('category', '==', toTitleCase(section)),
            where('subCategory', '==', categoryName),
            where('isDraft', '==', false),
            orderBy("createdAt", "desc"),
            limit(100)
        );
    }, [firestore, section, categoryName]);

    const { data: products, isLoading } = useCollection<Product>(productsQuery);

    const pageTitle = `${toTitleCase(slug)}`;
    const pageDescription = `Browse collectibles in the ${pageTitle} category.`;

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-8">
                <PageHeader
                    title={pageTitle}
                    description={pageDescription}
                />
            </div>
            
            {isLoading ? (
                <div className="container mx-auto px-4">
                    <ProductGridSkeleton count={20} />
                </div>
            ) : (
                <MontageGrid products={products || []} />
            )}
        </div>
    );
}


export default function CategoryPage() {
    return (
        <Suspense fallback={<ProductGridSkeleton count={20} />}>
            <CategoryPageContent />
        </Suspense>
    )
}
