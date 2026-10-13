import { getPublishedSiteConfig } from '@/lib/site-config/server';
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
  const category = typeof resolvedParams.category === 'string' ? resolvedParams.category : 'Sneakers';

  let title = 'Buy Sneakers Online in Australia | Authentic Kicks';
  let description = 'Buy and sell authentic sneakers in Australia: Nike, Jordan, adidas, New Balance and more. Verified sellers, DealSafe escrow and Australia-wide shipping.';

  if (q && category) {
    title = `Buy ${q} Sneakers in ${category}`;
    description = `Searching for ${q} in ${category}. Find the best sneaker deals authenticated by experts on Benched.`;
  } else if (q) {
    title = `Search Results for "${q}" Sneakers`;
    description = `Shop verified authentic results for "${q}". Browse the best performance basketball shoes on Benched Australia.`;
  } else if (category && category !== 'Sneakers') {
    title = `Buy ${category} Sneakers`;
    description = `Shop the best ${category} on Benched. Verified authentic performance footwear and secure shipping Australia-wide.`;
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

export default async function ShoesBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const header = (await getPublishedSiteConfig()).categoryHeaders.shoes;
  const resolvedParams = await searchParams;
  const searchTerm = typeof resolvedParams.q === 'string' ? resolvedParams.q : '';
  const categoryParam = typeof resolvedParams.category === 'string' ? resolvedParams.category : 'Sneakers';
  const subCategoryParam = typeof resolvedParams.subCategory === 'string' ? resolvedParams.subCategory : undefined;
  const brandParam = typeof resolvedParams.brand === 'string' ? resolvedParams.brand : undefined;
  const sizesParam = typeof resolvedParams.sizes === 'string' ? resolvedParams.sizes.split(',') : undefined;
  const conditionsParam = typeof resolvedParams.conditions === 'string' ? resolvedParams.conditions.split(',') : undefined;
  const verifiedOnlyParam = resolvedParams.verifiedOnly === 'true';
  const sortParam = typeof resolvedParams.sort === 'string' ? resolvedParams.sort : undefined;
  const manufacturerParam = typeof resolvedParams.manufacturer === 'string' ? resolvedParams.manufacturer : undefined;

  // Initial Server Fetch
  let initialProductsData;
  try {
    initialProductsData = await getProducts({
      q: searchTerm,
      category: categoryParam,
      subCategory: subCategoryParam,
      brand: brandParam,
      sizes: sizesParam,
      conditions: conditionsParam,
      verifiedOnly: verifiedOnlyParam,
      manufacturer: manufacturerParam,
      sort: sortParam,
      page: 1,
      limit: 24
    });
  } catch (error) {
    console.error("Initial fetch failed (likely missing index):", error);
    initialProductsData = undefined;
  }

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', item: '/' },
          { name: 'Shoes', item: '/shoes' },
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
          key={categoryParam}
          pageTitle={searchTerm ? `Results for "${searchTerm}"` : subCategoryParam ? `${subCategoryParam} ${categoryParam}` : header.title || 'All Sneakers'}
          pageDescription="Browse the best performance kicks from thousands of sellers."
          intro={!searchTerm && !subCategoryParam ? header.intro || undefined : undefined}
          initialFilterState={{
            q: searchTerm,
            category: categoryParam,
            subCategory: subCategoryParam,
            brand: brandParam,
            sizes: sizesParam,
            conditions: conditionsParam,
            verifiedOnly: verifiedOnlyParam,
            manufacturer: manufacturerParam,
            sort: sortParam,
            status: 'available'
          }}
          initialData={initialProductsData}
          titleAsH1={true}
        />
      </Suspense>
    </>
  );
}
