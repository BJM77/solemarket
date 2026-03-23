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

  let title = 'Shop the Full Marketplace Lineup | Shoes & Cards | Benched Australia';
  let description = 'Shop Australia\'s premier marketplace for performance basketball shoes, exclusive sneakers, and elite collector cards. Verified authentic, peer-to-peer, zero selling fees.';

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
  const subCategoryParam = typeof resolvedParams.subCategory === 'string' ? resolvedParams.subCategory : undefined;
  const brandParam = typeof resolvedParams.brand === 'string' ? resolvedParams.brand : undefined;
  const sizesParam = typeof resolvedParams.sizes === 'string' ? resolvedParams.sizes.split(',') : undefined;
  const conditionsParam = typeof resolvedParams.conditions === 'string' ? resolvedParams.conditions.split(',') : undefined;
  const verifiedOnlyParam = resolvedParams.verifiedOnly === 'true';
  const sortParam = typeof resolvedParams.sort === 'string' ? resolvedParams.sort : undefined;
  const manufacturerParam = typeof resolvedParams.manufacturer === 'string' ? resolvedParams.manufacturer : undefined;

  // Price range handling
  let priceRangeParam: [number, number] | undefined = undefined;
  if (typeof resolvedParams.priceRange === 'string') {
    const parts = resolvedParams.priceRange.split(',').map(Number);
    if (parts.length === 2 && !parts.some(isNaN)) {
      priceRangeParam = [parts[0], parts[1]] as [number, number];
    }
  }

  // Initial Server Fetch
  let initialProductsData;
  const targetCategory = typeof resolvedParams.category === 'string' ? resolvedParams.category : undefined;

  try {
    initialProductsData = await getProducts({
      q: searchTerm,
      category: targetCategory,
      subCategory: subCategoryParam,
      brand: brandParam,
      sizes: sizesParam,
      conditions: conditionsParam,
      verifiedOnly: verifiedOnlyParam,
      priceRange: priceRangeParam,
      manufacturer: manufacturerParam,
      sort: sortParam,
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
          pageTitle={searchTerm ? `Results for "${searchTerm}"` : subCategoryParam ? `${subCategoryParam} ${targetCategory}` : (targetCategory ? `All ${targetCategory}` : 'The Lineup')}
          pageDescription="Browse items from thousands of sellers."
          initialFilterState={{
            q: searchTerm,
            category: targetCategory,
            subCategory: subCategoryParam,
            brand: brandParam,
            sizes: sizesParam,
            conditions: conditionsParam,
            verifiedOnly: verifiedOnlyParam,
            priceRange: priceRangeParam,
            manufacturer: manufacturerParam,
            sort: sortParam
          }}
          initialData={initialProductsData} // Pass initial data
        />
      </Suspense>
    </>
  );
}

