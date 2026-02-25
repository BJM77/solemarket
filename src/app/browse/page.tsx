import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import { getProducts } from '@/services/product-service';
import type { Metadata } from 'next';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const q = typeof resolvedParams.q === 'string' ? resolvedParams.q : '';
  const category = typeof resolvedParams.category === 'string' ? resolvedParams.category : '';

  let title = 'Browse Sneakers | Benched';
  let description = 'Discover exclusive and authenticated sneakers on Benched Australia.';

  if (q && category) {
    title = `${q} in ${category} | Benched`;
    description = `Searching for ${q} in ${category}. Find the best sneaker deals on Benched.`;
  } else if (q) {
    title = `Search: ${q} | Benched`;
    description = `Results for "${q}". Browse verified authentic sneakers on Benched.`;
  } else if (category) {
    title = `${category} | Browse | Benched`;
    description = `Shop the best ${category} on Benched. Verified authentic and secure shipping.`;
  }

  const hasFilters = Object.keys(resolvedParams).filter(k => k !== 'category' && resolvedParams[k] !== undefined).length > 0;
  const isSearch = !!q;

  return {
    title,
    description,
    robots: (isSearch || hasFilters) ? 'noindex, follow' : 'index, follow',
    openGraph: {
      title,
      description,
      type: 'website',
    },
    alternates: {
      canonical: '/browse',
    }
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
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', item: '/' },
          { name: 'Browse Marketplace', item: '/browse' },
        ]}
      />
      <InfiniteProductGrid
        pageTitle={searchTerm ? `Results for "${searchTerm}"` : 'All Sneakers'}
        pageDescription="Browse items from thousands of sellers."
        initialFilterState={{
          q: searchTerm,
          category: typeof resolvedParams.category === 'string' ? resolvedParams.category : undefined
        }}
        initialData={initialProductsData} // Pass initial data
      />
    </>
  );
}
