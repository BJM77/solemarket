import { Suspense } from 'react';
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

  let title = 'Buy Performance Basketball Shoes & Sneakers | Benched Australia';
  let description = 'Shop Australia\'s premier marketplace for performance basketball shoes and exclusive sneakers. Verified authentic, peer-to-peer, with zero selling fees.';

  if (q && category) {
    title = `Buy ${q} in ${category} | Benched`;
    description = `Searching for ${q} in ${category}. Find the best sneaker deals authenticated by experts on Benched.`;
  } else if (q) {
    title = `Search Results for "${q}" | Benched`;
    description = `Shop verified authentic results for "${q}". Browse the best performance basketball shoes on Benched Australia.`;
  } else if (category) {
    title = `Buy ${category} Sneakers | Benched Australia`;
    description = `Shop the best ${category} on Benched. Verified authentic performance footwear and secure shipping Australia-wide.`;
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
          pageTitle={searchTerm ? `Results for "${searchTerm}"` : 'All Sneakers'}
          pageDescription="Browse items from thousands of sellers."
          initialFilterState={{
            q: searchTerm,
            category: typeof resolvedParams.category === 'string' ? resolvedParams.category : undefined
          }}
          initialData={initialProductsData} // Pass initial data
        />
      </Suspense>
    </>
  );
}

