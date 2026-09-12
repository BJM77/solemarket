import { Suspense } from "react";
import { getFeaturedProducts, getActiveProducts, getActiveListingCount } from "@/app/actions/marketplace/products";
import HeroModern from "@/components/home/HeroModern";
import BrandLogos from "@/components/home/BrandLogos";
import CategoryGrid from "@/components/home/CategoryGrid";
import CardCategoryGrid from "@/components/home/CardCategoryGrid";
import CoinCategoryGrid from "@/components/home/CoinCategoryGrid";
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

// Enable ISR with 60 second revalidation for fast homepage loading
export const revalidate = 60;

async function FeaturedSection() {
  const products = await getFeaturedProducts(12);
  return <TrendingGrid products={products} title="Featured Grails" />;
}

async function NewArrivalsSection() {
  const products = await getActiveProducts(12);
  return <TrendingGrid products={products} title="Fresh Steals" className="bg-background pt-8 pb-16 relative overflow-hidden" />;
}

import TopBannerAd from "@/components/home/TopBannerAd";

function TrendingSkeleton() {
  return (
    <section className="py-20 bg-black">
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
      <TopBannerAd />
      <HeroModern listingCount={listingCount} />
      <Suspense fallback={<TrendingSkeleton />}>
        <NewArrivalsSection />
      </Suspense>
      <Suspense fallback={<TrendingSkeleton />}>
        <FeaturedSection />
      </Suspense>
      <BrandLogos />
      <CategoryGrid />
      <CardCategoryGrid />
      <CoinCategoryGrid />
      <TrustBar />
      <section className="py-24 bg-black border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-5xl font-black uppercase mb-8 tracking-tighter">Your Trusted Australian Marketplace for Kicks & Cards</h2>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-6">
                Benched is the premier destination for performance basketball shoes and elite collector cards in Australia. Our secure, peer-to-peer platform connects local collectors, providing a transparent way to buy and sell authenticated grails with zero seller fees. Based in Perth, we serve the entire Australian hobby community with express shipping and our signature DealSafe escrow protection.
            </p>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                Whether you are chasing the latest SNKRS drop, looking for performance-ready Kobe Protro sneakers, or hunting for high-value PSA-graded NBA cards, Benched is built by collectors, for collectors. Join the thousand of Australians already trading on the fastest-growing secondary market in the country.
            </p>
        </div>
      </section>
    </main>
  );
}