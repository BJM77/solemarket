import { Suspense } from 'react';
import type { Metadata } from 'next';
import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { getCachedCategoryProducts } from '@/lib/cache/products';
import { coinsPageMetadata } from '@/lib/coins/seo';
import { COIN_SUBCATEGORIES } from '@/lib/coin-listings';
import { coinsPublicUrl } from '@/lib/storefront-routing';
import type { ProductSearchParams } from '@/lib/types';

type SP = Promise<{ [key: string]: string | string[] | undefined }>;

function readParams(p: { [key: string]: string | string[] | undefined }) {
  const q = typeof p.q === 'string' ? p.q.trim() : '';
  const coinType: 'coins' | 'bullion' | undefined = p.coinType === 'bullion' ? 'bullion' : p.coinType === 'coins' ? 'coins' : undefined;
  const subCategory = typeof p.subCategory === 'string' && (COIN_SUBCATEGORIES as readonly string[]).includes(p.subCategory) ? p.subCategory : undefined;
  const sort = typeof p.sort === 'string' ? p.sort : undefined;
  return { q, coinType, subCategory, sort };
}

function heading({ q, coinType, subCategory }: ReturnType<typeof readParams>): string {
  if (q) return `Results for "${q}"`;
  if (subCategory) return subCategory;
  if (coinType === 'bullion') return 'Bullion';
  if (coinType === 'coins') return 'Coins';
  return 'All coins & bullion';
}

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const p = readParams(await searchParams);
  const h = heading(p);
  const title = p.q ? `Search: ${p.q}` : `Buy ${h.replace(/^All /, '')} in Australia`;
  const description = p.q
    ? `Coin and bullion listings matching "${p.q}" from Australian sellers on Benched Coins.`
    : `Browse ${h.toLowerCase()} from Australian sellers on Benched Coins. Pay sellers directly by PayID or cash on pickup.`;
  // Search results and sorted views stay out of the index; category views are indexable.
  return coinsPageMetadata({ title, description, path: '/browse', noindex: Boolean(p.q || p.sort) });
}

export default async function CoinsBrowsePage({ searchParams }: { searchParams: SP }) {
  const p = readParams(await searchParams);
  const filterState: Partial<ProductSearchParams> = {
    coinsOnly: true,
    status: 'available',
    ...(p.q ? { q: p.q } : {}),
    ...(p.coinType ? { coinType: p.coinType } : {}),
    ...(p.subCategory ? { subCategory: p.subCategory } : {}),
  };

  let initialData;
  try {
    initialData = await getCachedCategoryProducts({ ...filterState, sort: p.sort, page: 1, limit: 24 });
  } catch (error) {
    console.error('Coins browse initial fetch failed:', error);
    initialData = undefined;
  }

  return (
    <>
      <BreadcrumbSchema items={[{ name: 'Benched Coins', item: coinsPublicUrl('/') }, { name: 'Browse', item: coinsPublicUrl('/browse') }]} />
      <Suspense fallback={<div className="container mx-auto px-4 py-8"><div className="h-96 w-full animate-pulse rounded-3xl bg-muted" /></div>}>
        <InfiniteProductGrid
          key={`${p.q}|${p.coinType}|${p.subCategory}`}
          storefront="coins"
          pageTitle={heading(p)}
          pageDescription="Coins, bullion and banknotes from Australian sellers."
          initialFilterState={filterState}
          initialData={initialData}
          titleAsH1={true}
        />
      </Suspense>
    </>
  );
}
