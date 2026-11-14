import { Suspense } from 'react';
import type { Metadata } from 'next';
import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import { getCachedCategoryProducts } from '@/lib/cache/products';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

// Pokémon & trading cards storefront (served at benched.au/pokemon now; pokemon.benched.au later).
const CATEGORY = 'Collector Cards';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const q = (await searchParams).q;
  const term = typeof q === 'string' ? q : '';
  const title = term ? `Pokémon & trading cards: "${term}"` : 'Buy Pokémon & trading cards in Australia';
  const description = term
    ? `Pokémon and trading card results for "${term}" from Australian collectors on Benched.`
    : 'Buy and sell Pokémon cards, graded slabs (PSA, BGS, CGC), sealed product and other trading card games from Australian collectors. Pay sellers directly by PayID or cash on pickup.';
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

  const filterState = {
    q: searchTerm,
    category: CATEGORY,
    includePokemon: true,
    tcgOnly: true,
    status: 'available' as const,
  };

  let initialData;
  try {
    initialData = await getCachedCategoryProducts({
      ...filterState,
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
      <BreadcrumbSchema items={[{ name: 'Home', item: '/' }, { name: 'Pokémon & trading cards', item: '/pokemon' }]} />
      <Suspense fallback={<div className="container mx-auto px-4 py-8"><div className="h-96 w-full bg-muted animate-pulse rounded-3xl" /></div>}>
        <InfiniteProductGrid
          pageTitle={searchTerm ? `Results for "${searchTerm}"` : 'Pokémon & trading cards'}
          pageDescription="Pokémon, Yu-Gi-Oh, Magic and other TCG singles, graded slabs and sealed product from Australian collectors."
          initialFilterState={filterState}
          initialData={initialData}
          titleAsH1={true}
        />
      </Suspense>
    </>
  );
}
