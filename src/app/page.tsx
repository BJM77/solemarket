import { Suspense } from "react";
import { getFeaturedProducts } from "@/app/actions/products";
import HeroModern from "@/components/home/HeroModern";
import CategoryRail from "@/components/home/CategoryRail";
import TrendingGrid from "@/components/home/TrendingGrid";
import TrustBar from "@/components/trust/TrustBar";

export const revalidate = 60; // ISR: Revalidate every 60 seconds

export default async function HomePage() {
  const featuredProducts = await getFeaturedProducts(12);

  return (
    <main>
      <HeroModern />
      <CategoryRail />
      <TrendingGrid products={featuredProducts} />
      <TrustBar />
    </main>
  );
}
