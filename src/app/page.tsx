import { Suspense } from "react";
import { getFeaturedProducts, getActiveListingCount } from "@/app/actions/products";
import HeroModern from "@/components/home/HeroModern";
import BrandLogos from "@/components/home/BrandLogos";
import CategoryGrid from "@/components/home/CategoryGrid";
import CardCategoryGrid from "@/components/home/CardCategoryGrid";
import TrendingGrid from "@/components/home/TrendingGrid";
import TrustBar from "@/components/trust/TrustBar";
import { PlayerCollections } from "@/components/home/PlayerCollections";
import { Skeleton } from "@/components/ui/skeleton";
import { brandConfig } from "@/config/brand";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: brandConfig.seo.defaultTitle,
  description: brandConfig.seo.defaultDescription,
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function FeaturedSection() {
  const products = await getFeaturedProducts(12);
  return <TrendingGrid products={products} title="Starting Lineup" />;
}

function TrendingSkeleton() {
  return (
    <section className="py-20 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-end justify-between mb-10">
          <div>
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-6 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-64 w-full rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const listingCount = await getActiveListingCount();

  return (
    <main>
      <HeroModern listingCount={listingCount} />
      <BrandLogos />
      <CategoryGrid />
      <CardCategoryGrid />
      <Suspense fallback={<TrendingSkeleton />}>
        <FeaturedSection />
      </Suspense>
      <TrustBar />
    </main>
  );
}