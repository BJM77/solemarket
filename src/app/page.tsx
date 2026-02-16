import { Suspense } from "react";
import { getFeaturedProducts } from "@/app/actions/products";
import HeroModern from "@/components/home/HeroModern";
import CategoryGrid from "@/components/home/CategoryGrid";
import TrendingGrid from "@/components/home/TrendingGrid";
import TrustBar from "@/components/trust/TrustBar";
import { Skeleton } from "@/components/ui/skeleton";

export const revalidate = 60; // ISR: Revalidate every 60 seconds

async function FeaturedSection() {
  const products = await getFeaturedProducts(12);
  return <TrendingGrid products={products} />;
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

export default function HomePage() {
  return (
    <main>
      <HeroModern />
      <CategoryGrid />
      <Suspense fallback={<TrendingSkeleton />}>
        <FeaturedSection />
      </Suspense>
      <TrustBar />
    </main>
  );
}