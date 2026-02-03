import Hero from "@/components/home/Hero";
import { Suspense } from "react";
import { fetchProductCount } from "@/app/actions/stats";
import { SearchBar } from "@/components/layout/search-bar";
import FeaturedCategories from "@/components/home/FeaturedCategories";

export const revalidate = 60; // ISR: Revalidate every 60 seconds

export default async function HomePage() {
  let productCount: number | null = null;
  let error: string | null = null;

  try {
    productCount = await fetchProductCount();
  } catch (e: any) {
    console.error("Homepage stats error:", e);
    error = "Could not load marketplace stats.";
  }

  return (
    <main>
      <Hero productCount={productCount} error={error} />
      <Suspense>
        <FeaturedCategories />
      </Suspense>
      <div className="max-w-[1440px] mx-auto px-4 md:px-10">
        <div className="py-16 border-t border-[#e7ebf3] dark:border-white/10">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h2 className="text-3xl font-black">Find It Here</h2>
            <p className="text-gray-500 dark:text-gray-400">Picksy is the premier marketplace for collectors. Search our curated selection of high-value cards, coins, and comics.</p>
            <SearchBar className="relative flex items-center h-16" inputClassName="h-16 text-base pl-6 pr-32 rounded-2xl shadow-lg" buttonClassName="absolute right-3 h-10 px-6 rounded-xl" />
          </div>
        </div>
      </div>
    </main>
  );
}
