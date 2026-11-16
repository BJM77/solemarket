import { Suspense } from 'react';
import type { Metadata } from 'next';
import CoinsBrowseGrid from '@/components/coins/CoinsBrowseGrid';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { coinsPageMetadata } from '@/lib/coins/seo';
import { loadCoinsCatalog } from '@/lib/coins/catalog';
import { activeCoinFilterCount, coinsBrowseHeading, parseCoinFilters } from '@/lib/coins/filters';
import { coinsPublicUrl } from '@/lib/storefront-routing';

type SP = Promise<{ [key: string]: string | string[] | undefined }>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const f = parseCoinFilters(await searchParams);
  const h = coinsBrowseHeading(f);
  const title = f.q ? `Search: ${f.q}` : `Buy ${h.replace(/^All /, '')} in Australia`;
  const description = f.q
    ? `Coin and bullion listings matching "${f.q}" from Australian sellers on Benched Coins.`
    : `Browse ${h.toLowerCase()} from Australian sellers on Benched Coins. Pay sellers directly by PayID or cash on pickup.`;
  // Search results, sorted and filtered views stay out of the index; type/category views are indexable.
  const narrowed = activeCoinFilterCount({ ...f, q: undefined, sort: undefined, coinType: undefined, subCategory: undefined }) > 0;
  return coinsPageMetadata({ title, description, path: '/browse', noindex: Boolean(f.q || f.sort || narrowed) });
}

export default async function CoinsBrowsePage({ searchParams }: { searchParams: SP }) {
  const filters = parseCoinFilters(await searchParams);
  const { products, spot } = await loadCoinsCatalog();

  return (
    <>
      <BreadcrumbSchema items={[{ name: 'Benched Coins', item: coinsPublicUrl('/') }, { name: 'Browse', item: coinsPublicUrl('/browse') }]} />
      <Suspense fallback={<div className="container mx-auto px-4 py-8"><div className="h-96 w-full animate-pulse rounded-3xl bg-muted" /></div>}>
        <CoinsBrowseGrid products={products} spot={spot} initialFilters={filters} titleAsH1 syncUrl />
      </Suspense>
    </>
  );
}
