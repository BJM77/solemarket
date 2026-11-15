import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { ArrowRight, Banknote, Coins, Gem, Globe, Package, ShieldCheck } from 'lucide-react';
import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { getCachedCategoryProducts } from '@/lib/cache/products';
import { coinsPageMetadata } from '@/lib/coins/seo';
import { STOREFRONTS } from '@/config/storefronts';
import { coinsPublicUrl } from '@/lib/storefront-routing';

export const metadata = coinsPageMetadata({
  title: STOREFRONTS.coins.seo.title,
  description: 'Buy and sell Australian and world coins, gold and silver bullion, proof sets and banknotes from Australian collectors. Pay sellers directly by PayID or cash on pickup.',
  path: '/',
  absoluteTitle: true,
});

const TILES = [
  { label: 'Australian coins', href: '/coins/browse?subCategory=Australian+Coins', Icon: Coins },
  { label: 'World coins', href: '/coins/browse?subCategory=World+Coins', Icon: Globe },
  { label: 'Gold bullion', href: '/coins/browse?subCategory=Gold+Bullion', Icon: Gem },
  { label: 'Silver bullion', href: '/coins/browse?subCategory=Silver+Bullion', Icon: Gem },
  { label: 'Proof & mint sets', href: '/coins/browse?subCategory=Proof+%26+Mint+Sets', Icon: Package },
  { label: 'Banknotes', href: '/coins/browse?subCategory=Banknotes', Icon: Banknote },
];

export default async function CoinsHomePage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  // Old /coins?q=... and /coins?subCategory=... links now live on /coins/browse.
  const sp = await searchParams;
  const carry = new URLSearchParams();
  for (const key of ['q', 'subCategory', 'coinType', 'sort']) {
    const v = sp[key];
    if (typeof v === 'string' && v) carry.set(key, v);
  }
  if ([...carry.keys()].length) redirect(`/coins/browse?${carry.toString()}`);

  const filterState = { coinsOnly: true, status: 'available' as const };
  let initialData;
  try {
    initialData = await getCachedCategoryProducts({ ...filterState, page: 1, limit: 24 });
  } catch (error) {
    console.error('Coins home initial fetch failed:', error);
    initialData = undefined;
  }

  return (
    <>
      <BreadcrumbSchema items={[{ name: 'Benched Coins', item: coinsPublicUrl('/') }]} />
      <section className="bg-gradient-to-b from-amber-50 to-background dark:from-amber-950/30">
        <div className="container mx-auto max-w-screen-2xl px-4 py-12 md:py-16">
          <p className="mb-3 text-xs font-black uppercase tracking-widest text-amber-700">Benched Coins</p>
          <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-6xl">Coins and bullion from Australian collectors</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Australian and world coins, gold and silver bullion, proof sets and banknotes. Message sellers through Benched and pay them directly by PayID or cash on pickup.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/coins/browse" className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">
              Shop coins &amp; bullion <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/coins/sell" className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400">
              Sell a coin
            </Link>
          </div>
          <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {TILES.map(({ label, href, Icon }) => (
              <li key={href}>
                <Link href={href} className="flex h-full flex-col gap-2 rounded-2xl border border-border bg-card p-4 text-sm font-bold shadow-sm hover:border-amber-500">
                  <Icon className="h-5 w-5 text-amber-600" aria-hidden />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Suspense fallback={<div className="container mx-auto px-4 py-8"><div className="h-96 w-full animate-pulse rounded-3xl bg-muted" /></div>}>
        <InfiniteProductGrid
          storefront="coins"
          pageTitle="Latest coins & bullion"
          pageDescription="New listings from Australian sellers."
          initialFilterState={filterState}
          initialData={initialData}
        />
      </Suspense>

      <section className="container mx-auto max-w-screen-2xl px-4 pb-8">
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-5 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          <p>
            Every listing is written by its seller. Benched Coins doesn&apos;t grade, assay or authenticate coins or bullion, so check the photos,
            any PCGS/NGC slab and cert number, and ask the seller questions before you buy. Spot prices at the top of the page are indicative only.
          </p>
        </div>
      </section>
    </>
  );
}
