'use client';
import { Suspense } from "react";
import ProductGridSkeleton from "@/components/products/ProductGridSkeleton";
import CollectorCardsClient from "./CollectorCardsClient";

export default function CollectorCardsPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8"><ProductGridSkeleton count={20} /></div>}>
      <CollectorCardsClient
        pageTitle="Collector Cards"
        pageDescription="Browse all sports, trading, and graded cards."
        category="Collector Cards"
      />
    </Suspense>
  );
}
