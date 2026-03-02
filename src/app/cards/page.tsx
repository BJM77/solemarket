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

  let title = 'Buy NBA Trading Cards & Collector Cards | Benched Australia';
  let description = 'Shop Australia\'s premier marketplace for rare NBA trading cards, Panini Prizms, and exclusive sports cards. 100% authenticated. Peer-to-peer. Zero selling fees.';

  if (q && category) {
    title = `Buy ${q} Cards in ${category} | Benched`;
    description = `Searching for ${q} in ${category}. Find the best deals on rare and graded trading cards in Australia.`;
  } else if (q) {
    title = `Search Results for "${q}" Cards | Benched`;
    description = `Shop verified authentic results for "${q}". Browse the best rare collector cards on Benched Australia.`;
  } else if (category) {
    title = `Buy ${category} Trading Cards | Benched Australia`;
    description = `Shop the best rare ${category} on Benched. Secure shipping Australia-wide and vetted authentic.`;
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
