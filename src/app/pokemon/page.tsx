import { Suspense } from 'react';
import type { Metadata } from 'next';
import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import { getCachedCategoryProducts } from '@/lib/cache/products';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

// Pokémon storefront (served at benched.au/pokemon now; pokemon.benched.au later).
const CATEGORY = 'Collector Cards';
const SUB_CATEGORY = 'Pokémon';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const q = (await searchParams).q;
  const term = typeof q === 'string' ? q : '';
  const title = term ? `Pokémon Cards: "${term}"` : 'Buy Pokémon Cards & TCG in Australia';
  const description = term
    ? `Pokémon card results for "${term}" from Australian collectors on Benched.`
    : 'Buy and sell Pokémon cards, graded slabs (PSA, BGS, CGC) and sealed TCG product from Australian collectors. Pay sellers directly by PayID or cash on pickup.';
  return { title, description, alternates: { canonical: '/pokemon' }, openGraph: { title, description, type: 'website' } };
}

export default async function PokemonPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolved = await searchParams;
  const searchTerm = typeof resolved.q === 'string' ? resolved.q : '';
  const sort = typeof resolved.sort === 'string' ? resolved.sort : undefined;

  let initialData;
  try {
    initialData = await getCachedCategoryProducts({
      q: searchTerm,
      category: CATEGORY,
      subCategory: SUB_CATEGORY,
      sort,
      page: 1,
      limit: 24,
    });
  } catch (error) {
    console.error('Pokémon initial fetch failed:', error);
    initialData = undefined;
  }

  return (
    <>
      <BreadcrumbSchema items={[{ name: 'Home', item: '/' }, { name: 'Pokémon', item: '/pokemon' }]} />
      <Suspense fallback={<div className="container mx-auto px-4 py-8"><div className="h-96 w-full bg-muted animate-pulse rounded-3xl" /></div>}>
        <InfiniteProductGrid
          pageTitle={searchTerm ? `Pokémon results for "${searchTerm}"` : 'Pokémon Cards & TCG'}
          pageDescription="Singles, graded slabs and sealed product from Australian collectors."
          initialFilterState={{ q: searchTerm, category: CATEGORY, subCategory: SUB_CATEGORY, status: 'available' }}
          initialData={initialData}
          titleAsH1={true}
        />
      </Suspense>
    </>
  );
}
