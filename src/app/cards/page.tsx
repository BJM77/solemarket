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

  let title = 'Browse Collector Cards | Benched';
  let description = 'Discover rare NBA and Basketball collector cards on Benched Australia.';

  if (q && category) {
    title = `${q} in ${category} | Benched`;
    description = `Searching for ${q} in ${category}. Find the best card deals on Benched.`;
  } else if (q) {
    title = `Search: ${q} | Benched`;
    description = `Results for "${q}". Browse verified authentic collector cards on Benched.`;
  } else if (category) {
    title = `${category} | Browse | Benched`;
    description = `Shop the best ${category} on Benched. Verified authentic and secure shipping.`;
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

export default async function CardsBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;
  const searchTerm = typeof resolvedParams.q === 'string' ? resolvedParams.q : '';
  const categoryParam = typeof resolvedParams.category === 'string' ? resolvedParams.category : 'Collector Cards';

  // Initial Server Fetch
  let initialProductsData;
  try {
    initialProductsData = await getProducts({
      q: searchTerm,
      category: categoryParam,
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
      pageTitle={searchTerm ? `Results for "${searchTerm}"` : 'All Collector Cards'}
      pageDescription="Browse the rarest cards from thousands of collectors."
      initialFilterState={{
        q: searchTerm,
        category: categoryParam
      }}
      initialData={initialProductsData} // Pass initial data
    />
  );
}
