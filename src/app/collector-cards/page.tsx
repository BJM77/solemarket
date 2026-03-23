import { Suspense } from 'react';
import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import { getProducts } from '@/services/product-service';
import type { Metadata } from 'next';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

export const metadata: Metadata = {
  title: 'Buy Collector Cards & NBA Trading Cards | Benched Australia',
  description: 'Shop the finest collection of NBA, Pokémon, and rare collector cards in Australia. Verified authentic, hobby-focused marketplace with secure DealSafe protection.',
  keywords: ['collector cards', 'nba cards', 'pokemon cards', 'panini', 'topps', 'australia'],
};

export default async function CollectorCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;
  const searchTerm = typeof resolvedParams.q === 'string' ? resolvedParams.q : '';
  
  // Initial Server Fetch for 'Collector Cards' category
  let initialProductsData;
  try {
    initialProductsData = await getProducts({
      q: searchTerm,
      category: 'Collector Cards',
      page: 1,
      limit: 24
    });
  } catch (error) {
    console.error("Initial fetch failed:", error);
    initialProductsData = undefined;
  }

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', item: '/' },
          { name: 'Collector Cards', item: '/collector-cards' },
        ]}
      />
      <div className="bg-slate-950 text-white py-12 md:py-20">
        <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">
                The Hobby <span className="text-indigo-400 italic">Vault.</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl leading-relaxed">
                From graded NBA singles to sealed Pokémon hobby boxes. 
                Australia&apos;s most trusted secure trading card marketplace.
            </p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div className="h-96 w-full bg-slate-100 animate-pulse rounded-3xl" />}>
            <InfiniteProductGrid
                pageTitle="Available Cards"
                pageDescription="Explore the rarest collectibles from the Australian hobby community."
                initialFilterState={{
                    q: searchTerm,
                    category: 'Collector Cards'
                }}
                initialData={initialProductsData}
            />
        </Suspense>

        <div className="mt-24 pt-16 border-t border-slate-100 dark:border-white/5 max-w-4xl">
            <h2 className="text-3xl font-black uppercase mb-6 tracking-tight">Your Destination for Collector Cards in Australia</h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                Benched is the premier Australian destination for serious card collectors and hobbyists. We specialize in providing a safe, hobby-first marketplace for NBA, Pokémon, and high-value trading cards. Whether you are searching for a Victor Wembanyama rookie card to complete your set or hunting for a rare Pokémon 151 booster box, Benched connects you with authentic listings from across the country.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
                Our platform features zero seller fees, ensuring that collectors can grow their portfolios without losing value to high commissions. Every high-value card transaction is secured via our DealSafe escrow system, providing the most reliable way to buy and sell premium collectibles in Melbourne, Sydney, Perth, and beyond.
            </p>
        </div>
      </div>
    </>
  );
}
