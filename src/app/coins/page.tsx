import { Suspense } from "react";
import ProductGridSkeleton from "@/components/products/ProductGridSkeleton";
import InfiniteProductGrid from "@/components/products/InfiniteProductGrid";
import { getProducts } from "@/services/product-service";

export const metadata = {
  title: 'Collector Coins | Picksy',
  description: 'Browse rare coins, bullion, and banknotes on Picksy.',
};

export default async function CollectorCoinsPage() {
  // Initial Server Fetch
  const initialData = await getProducts({
    category: 'Coins',
    page: 1,
    limit: 24,
    sort: 'createdAt-desc'
  });

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
          initialData={initialData}
        />
      </Suspense>
    </div>
  );
}
