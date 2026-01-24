'use client';
import { Suspense } from "react";
import ProductGridSkeleton from "@/components/products/ProductGridSkeleton";
import CollectorCardsClient from "../CollectorCardsClient";

export default function SportsCardsPage() {
    return (
        <Suspense fallback={<div className="container mx-auto px-4 py-8"><ProductGridSkeleton count={20} /></div>}>
            <CollectorCardsClient 
                pageTitle="Sports Cards"
                pageDescription="Browse our collection of basketball, baseball, football cards and more."
                subCategory="Sports Cards"
                category="Collector Cards"
            />
        </Suspense>
    );
}
