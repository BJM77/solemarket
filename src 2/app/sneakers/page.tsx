import { Suspense } from 'react';
import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import { getProducts } from '@/services/product-service';
import type { Metadata } from 'next';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

export const metadata: Metadata = {
  title: 'Buy Performance Sneakers & Basketball Shoes | Benched Australia',
  description: 'Shop the largest collection of authentic performance sneakers and basketball shoes in Australia. Verified safe, local Perth-based marketplace with nationwide shipping.',
  keywords: ['sneakers', 'basketball shoes', 'nike', 'jordan', 'adidas', 'australia'],
};

export default async function SneakersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;
  const searchTerm = typeof resolvedParams.q === 'string' ? resolvedParams.q : '';
  
  // Initial Server Fetch for 'Sneakers' category
  let initialProductsData;
  try {
    initialProductsData = await getProducts({
      q: searchTerm,
      category: 'Sneakers',
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
          { name: 'Sneakers', item: '/sneakers' },
        ]}
      />
      <div className="bg-black text-white py-12 md:py-20">
        <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">
                The Sneaker <span className="text-primary italic">Lineup.</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl leading-relaxed">
                From court-ready performance kicks to the rarest street grails. 
                Shop Australia&apos;s most trusted peer-to-peer sneaker marketplace.
            </p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div className="h-96 w-full bg-slate-100 animate-pulse rounded-3xl" />}>
            <InfiniteProductGrid
                pageTitle="Available Sneakers"
                pageDescription="Browse authentic listings from verified sellers across Australia."
                initialFilterState={{
                    q: searchTerm,
                    category: 'Sneakers'
                }}
                initialData={initialProductsData}
            />
        </Suspense>

        <div className="mt-24 pt-16 border-t border-slate-100 dark:border-white/5 max-w-4xl">
            <h2 className="text-3xl font-black uppercase mb-6 tracking-tight">Your Destination for Sneakers in Australia</h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                Benched is the premier Australian destination for sneakerheads and basketball players. We specialize in providing a safe, transparent, and local marketplace for performance footwear. Whether you are hunting for the latest Jordan 1 Retro or looking for a performance pair of Kobe 6s to take to the court, Benched connects you with authentic listings from thousands of local collectors.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
                By focusing on a peer-to-peer model with zero seller fees, we ensure that collectors keep more of their money while browsers find the best deals in Australia. Every transaction is protected by our DealSafe security, giving you peace of mind from Perth to Sydney and everywhere in between.
            </p>
        </div>
      </div>
    </>
  );
}
