import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Flame, Layers, Package, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import { pageOpenGraph } from '@/lib/seo/og';
import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import { getCachedCategoryProducts } from '@/lib/cache/products';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import SectionPaginationServer from '@/components/seo/SectionPaginationServer';

// Pokémon & trading cards storefront (served at benched.au/pokemon now; pokemon.benched.au later).
const CATEGORY = 'Collector Cards';

const POKEMON_TILES = [
  { label: 'Scarlet & Violet', href: '/pokemon?q=Scarlet+Violet', Icon: Sparkles },
  { label: 'Vintage (WOTC & 1999)', href: '/pokemon?q=vintage+WOTC', Icon: Trophy },
  { label: 'Graded Slabs (PSA / CGC)', href: '/pokemon?gradingCompanies=PSA&gradingCompanies=CGC', Icon: ShieldCheck },
  { label: 'Charizard Cards', href: '/pokemon?q=Charizard', Icon: Flame },
  { label: 'Sealed Booster Boxes', href: '/pokemon?q=booster+box+sealed', Icon: Package },
  { label: 'Japanese Cards', href: '/pokemon?q=Japanese', Icon: Layers },
];

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const q = (await searchParams).q;
  const term = typeof q === 'string' ? q : '';
  const title = term ? `Pokémon & trading cards: "${term}"` : 'Buy Pokémon & trading cards in Australia | Benched';
  const description = term
    ? `Pokémon and trading card results for "${term}" from Australian collectors on Benched.`
    : 'Buy and sell Pokémon cards, graded slabs (PSA, BGS, CGC), sealed product and other trading card games from Australian collectors. Pay sellers directly by PayID or cash on pickup.';
  return { title, description, alternates: { canonical: '/pokemon' }, openGraph: pageOpenGraph({ title, description, path: '/pokemon' }) };
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

  const isHomeView = !searchTerm && !sort;

  return (
    <>
      <BreadcrumbSchema items={[{ name: 'Home', item: '/' }, { name: 'Pokémon & trading cards', item: '/pokemon' }]} />

      {isHomeView && (
        <section className="bg-gradient-to-b from-red-50/70 via-amber-50/40 to-background dark:from-red-950/20">
          <div className="container mx-auto max-w-screen-2xl px-4 py-10 md:py-14">
            <p className="mb-2 text-xs font-black uppercase tracking-widest text-red-600">Benched Pokémon &amp; TCG</p>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-5xl">
              Pokémon cards and TCG singles from Australian collectors
            </h1>
            <p className="mt-3 max-w-2xl text-base md:text-lg text-muted-foreground">
              Modern hits, vintage Wizards of the Coast grails, PSA &amp; CGC graded slabs, and sealed boxes.
              Pay Australian sellers directly with zero buyer fees via PayID or cash on pickup.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/sell/create?category=Collector+Cards&subCategory=Pok%C3%A9mon&storefront=pokemon"
                className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-red-700"
              >
                Sell a Pokémon Card <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/sell/bulk?storefront=pokemon"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50"
              >
                Fast Bulk Photo Upload
              </Link>
            </div>
            <ul className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
              {POKEMON_TILES.map(({ label, href, Icon }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="flex h-full flex-col gap-1.5 rounded-2xl border border-border bg-card p-3.5 text-xs font-bold shadow-sm transition hover:border-red-500 hover:shadow-md"
                  >
                    <Icon className="h-5 w-5 text-red-600" aria-hidden />
                    <span>{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <Suspense fallback={<div className="container mx-auto px-4 py-8"><div className="h-96 w-full bg-muted animate-pulse rounded-3xl" /></div>}>
        <InfiniteProductGrid
          pageTitle={searchTerm ? `Results for "${searchTerm}"` : 'Pokémon & trading cards'}
          pageDescription="Pokémon, Yu-Gi-Oh, Magic and other TCG singles, graded slabs and sealed product from Australian collectors."
          initialFilterState={filterState}
          initialData={initialData}
          titleAsH1={!isHomeView}
        />
      </Suspense>

      <section className="container mx-auto max-w-screen-2xl px-4 py-6">
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
          <p>
            Every card listing is written by its Australian collector. Check cert numbers on PSA and CGC slabs, inspect high-res photos for edge wear and centering, and message the seller before paying via PayID or arranging local meetup.
          </p>
        </div>
      </section>

      {Object.keys(resolved).every((k) => k === 'view') && <SectionPaginationServer section="pokemon" />}
    </>
  );
}
