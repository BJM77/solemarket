import { Suspense } from 'react';
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
  const subCategoryParam = typeof resolvedParams.subCategory === 'string' ? resolvedParams.subCategory : undefined;

  // Initial Server Fetch
  let initialProductsData;
  try {
    initialProductsData = await getProducts({
      q: searchTerm,
      category: categoryParam,
      subCategory: subCategoryParam,
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
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="h-12 w-64 bg-muted animate-pulse rounded-lg mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    }>
      <InfiniteProductGrid
        key={categoryParam}
        pageTitle={searchTerm ? `Results for "${searchTerm}"` : subCategoryParam ? `${subCategoryParam} Cards` : 'All Collector Cards'}
        pageDescription="Browse the rarest cards from thousands of collectors."
        initialFilterState={{
          q: searchTerm,
          category: categoryParam,
          subCategory: subCategoryParam
        }}
        initialData={initialProductsData} // Pass initial data
      />
    </Suspense>
  );
}

