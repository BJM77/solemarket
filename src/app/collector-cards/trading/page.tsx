'use client';
import { Suspense } from "react";
import ProductGridSkeleton from "@/components/products/ProductGridSkeleton";
import CollectorCardsClient from "../CollectorCardsClient";

export default function TradingCardsPage() {
    return (
        <Suspense fallback={<div className="container mx-auto px-4 py-8"><ProductGridSkeleton count={20} /></div>}>
            <CollectorCardsClient 
                pageTitle="Trading Cards"
                pageDescription="Explore a universe of trading cards from games like Pokémon, Magic: The Gathering, and more."
                subCategory="Trading Cards"
                category="Collector Cards"
            />
        </Suspense>
    );
}
