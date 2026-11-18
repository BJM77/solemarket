import { getPublishedSiteConfig } from '@/lib/site-config/server';
import { Suspense } from 'react';
import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import { getCachedCategoryProducts } from '@/lib/cache/products';
import type { Metadata } from 'next';
import { pageOpenGraph } from '@/lib/seo/og';
import { composeCategoryTitle } from '@/lib/seo/browse-heading';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import SectionPaginationServer from '@/components/seo/SectionPaginationServer';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const q = typeof resolvedParams.q === 'string' ? resolvedParams.q : '';
  const category = typeof resolvedParams.category === 'string' ? resolvedParams.category : '';

  let title = 'Buy Basketball Cards in Australia | NBA, WNBA & NBL Cards';
  let description = 'Buy and sell NBA, WNBA and NBL basketball cards in Australia, raw and graded. Pay sellers directly by PayID or cash on pickup.';

  if (q && category) {
    title = `Buy ${q} Cards in ${category}`;
    description = `Searching for ${q} in ${category}. Find the best deals on rare and graded trading cards in Australia.`;
  } else if (q) {
    title = `Search Results for "${q}" Cards`;
    description = `Cards matching "${q}" from Australian collectors on Benched.`;
  } else if (category) {
    title = `Buy ${category} Trading Cards`;
    description = `Shop the best rare ${category} on Benched. Pay sellers directly by PayID or cash on pickup.`;
  }

  return {
    title,
    description,
    openGraph: pageOpenGraph({ title, description, path: '/cards' }),
  };
}

export default async function CardsBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const header = (await getPublishedSiteConfig()).categoryHeaders.cards;
  const resolvedParams = await searchParams;
  const searchTerm = typeof resolvedParams.q === 'string' ? resolvedParams.q : '';
  const categoryParam = typeof resolvedParams.category === 'string' ? resolvedParams.category : 'Collector Cards';
  const subCategoryParam = typeof resolvedParams.subCategory === 'string' ? resolvedParams.subCategory : undefined;

  // Initial Server Fetch
  let initialProductsData;
  try {
    initialProductsData = await getCachedCategoryProducts({
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
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', item: '/' },
          { name: 'Cards', item: '/cards' },
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
          pageTitle={searchTerm ? `Results for "${searchTerm}"` : subCategoryParam ? composeCategoryTitle(subCategoryParam, 'Cards') : header.title || 'All Collector Cards'}
          pageDescription="Browse basketball cards from Australian collectors."
          intro={!searchTerm && !subCategoryParam ? header.intro || undefined : undefined}
          initialFilterState={{
            q: searchTerm,
            category: categoryParam,
            subCategory: subCategoryParam,
            status: 'available'
          }}
          initialData={initialProductsData} // Pass initial data
          titleAsH1={true}
        />
      </Suspense>
      {Object.keys(resolvedParams).every((k) => k === 'view') && <SectionPaginationServer section="cards" />}
    </>
  );
}

