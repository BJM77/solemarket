import { Suspense } from "react";
import ProductGridSkeleton from "@/components/products/ProductGridSkeleton";
import InfiniteProductGrid from "@/components/products/InfiniteProductGrid";
import { getProducts } from "@/services/product-service";

export const metadata = {
  title: 'Collector Cards | Picksy',
  description: 'Browse all sports, trading, and graded cards on Picksy.',
};

export default async function CollectorCardsPage() {
  const initialData = await getProducts({
    category: 'Collector Cards',
    page: 1,
    limit: 24,
    sort: 'createdAt-desc'
  });

  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8"><ProductGridSkeleton count={20} /></div>}>
      <InfiniteProductGrid
        pageTitle="Collector Cards"
        pageDescription="Browse all sports, trading, and graded cards."
        initialFilterState={{
          category: 'Collector Cards',
          view: 'grid'
        }}
        initialData={initialData}
      />
    </Suspense>
  );
}
