'use client';
import Hero from "@/components/home/Hero";
import { Suspense, useState, useEffect } from "react";
import { fetchProductCount } from "@/app/actions/stats";
import { SearchBar } from "@/components/layout/search-bar";
import FeaturedCategories from "@/components/home/FeaturedCategories";

export default function HomePage() {
  const [productCount, setProductCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const count = await fetchProductCount();
        setProductCount(count);
      } catch (e: any) {
        console.error("Homepage stats error:", e);
        setError("Could not load marketplace stats.");
      }
    }
    fetchStats();
  }, []);

  return (
    <main>
      <Hero productCount={productCount} error={error} />
      <Suspense>
        <FeaturedCategories />
      </Suspense>
      <div className="max-w-[1440px] mx-auto px-4 md:px-10">
        <div className="py-16 border-t border-[#e7ebf3] dark:border-white/10">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h2 className="text-3xl font-black">Can't find your grail?</h2>
            <p className="text-gray-500 dark:text-gray-400">Describe what you're looking for, and our AI will scour global private collections and upcoming auctions.</p>
            <SearchBar className="relative flex items-center h-16" inputClassName="h-16 text-base pl-6 pr-32 rounded-2xl shadow-lg" buttonClassName="absolute right-3 h-10 px-6 rounded-xl" />
          </div>
        </div>
      </div>
    </main>
  );
}
