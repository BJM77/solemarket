'use client';
import { Suspense } from "react";
import ProductGridSkeleton from "@/components/products/ProductGridSkeleton";

import InfiniteProductGrid from "@/components/products/InfiniteProductGrid";

export default function CollectorCoinsPage() {
  return (
    <div className="min-h-screen">
      <Suspense fallback={<div className="container mx-auto px-4 py-8"><ProductGridSkeleton count={20} /></div>}>
        <InfiniteProductGrid
          pageTitle="Collector Coins"
          pageDescription="Browse rare coins, bullion, and banknotes."
          initialFilterState={{
            category: 'Coins',
            view: 'grid'
          }}
        />
      </Suspense>
    </div>
  );
}
