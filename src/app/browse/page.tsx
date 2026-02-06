import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import { getProducts } from '@/services/product-service';
import type { Metadata } from 'next';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const q = typeof resolvedParams.q === 'string' ? resolvedParams.q : '';
  const category = typeof resolvedParams.category === 'string' ? resolvedParams.category : '';

  let title = 'Browse Collectibles | Picksy';
  let description = 'Discover thousands of unique collectibles, trading cards, and coins on Picksy Marketplace.';

  if (q && category) {
    title = `${q} in ${category} | Picksy`;
    description = `Searching for ${q} in ${category}. Find the best deals on Picksy.`;
  } else if (q) {
    title = `Search: ${q} | Picksy`;
    description = `Results for "${q}". Browse high-value collectibles on Picksy.`;
  } else if (category) {
    title = `${category} | Browse | Picksy`;
    description = `Shop the best ${category} on Picksy. Verified sellers and secure shipping.`;
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}

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
