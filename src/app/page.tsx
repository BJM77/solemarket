import { Suspense } from "react";
import { getFeaturedProducts, getActiveProducts, getActiveListingCount } from "@/app/actions/marketplace/products";
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
  return <TrendingGrid products={products} title="Featured Grails" />;
}

async function NewArrivalsSection() {
  const products = await getActiveProducts(12);
  return <TrendingGrid products={products} title="Fresh Steals" className="bg-background pt-8 pb-16 relative overflow-hidden" />;
}

function DemoAdvertisement() {
  return (
    <div className="w-full md:w-4/5 mx-auto bg-slate-900 text-white overflow-hidden relative group cursor-pointer block md:my-2 shadow-sm">
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className="container mx-auto px-4 py-3 text-center relative z-10 flex flex-col sm:flex-row items-center justify-center gap-2 md:gap-6">
        <span className="bg-primary text-white text-[10px] md:text-xs font-black uppercase px-2 py-0.5 rounded-sm tracking-wider">Advertisement</span>
        <p className="text-sm md:text-base font-semibold tracking-wide">
          Limited Time Offer: Get <span className="text-primary font-black">50% OFF</span> authentication services with code <span className="border border-primary/20 px-2 py-0.5 rounded bg-primary/5 ml-1 text-primary">BENCHED50</span>
        </p>
      </div>
    </div>
  );
}

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
      <DemoAdvertisement />
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