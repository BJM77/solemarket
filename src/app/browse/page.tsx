import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import { getProducts } from '@/services/product-service';

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;
  const searchTerm = typeof resolvedParams.q === 'string' ? resolvedParams.q : '';

  // Initial Server Fetch
  let initialProductsData;
  try {
    initialProductsData = await getProducts({
      q: searchTerm,
      category: typeof resolvedParams.category === 'string' ? resolvedParams.category : undefined,
      sort: typeof resolvedParams.sort === 'string' ? resolvedParams.sort : undefined,
      page: 1,
      limit: 24
    });
  } catch (error) {
    console.error("Initial fetch failed (likely missing index):", error);
    // return undefined to let client fetch and show error
    initialProductsData = undefined;
  }

  return (
    <InfiniteProductGrid
      pageTitle={searchTerm ? `Results for "${searchTerm}"` : 'All Collectibles'}
      pageDescription="Browse items from thousands of sellers."
      initialFilterState={{
        q: searchTerm,
        category: typeof resolvedParams.category === 'string' ? resolvedParams.category : undefined
      }}
      initialData={initialProductsData} // Pass initial data
    />
  );
}
