'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, CreditCard, ToyBrick, Gamepad2, Star, Footprints, LayoutGrid, Loader2 } from "lucide-react";
import { collection, query, getDocs, doc, getDoc } from "firebase/firestore";
import { useFirebase } from "@/firebase";
import type { Category } from "@/lib/types";

// Helper to map category names to icons
const getCategoryIcon = (name: string) => {
  const lowercaseName = name.toLowerCase();
  if (lowercaseName.includes('pokemon')) return <Gamepad2 className="h-6 w-6" />;
  if (lowercaseName.includes('coin')) return <Coins className="h-6 w-6" />;
  if (lowercaseName.includes('barbie')) return <ToyBrick className="h-6 w-6" />;
  if (lowercaseName.includes('nba') || lowercaseName.includes('card')) return <CreditCard className="h-6 w-6" />;
  if (lowercaseName.includes('rookie')) return <Star className="h-6 w-6" />;
  if (lowercaseName.includes('shoe')) return <Footprints className="h-6 w-6" />;
  return <LayoutGrid className="h-6 w-6" />;
};

export default function FeaturedCategories() {
  const { firestore } = useFirebase();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHomepageCategories = async () => {
      if (!firestore) return;

      try {
        // 1. Fetch system settings
        const settingsSnap = await getDoc(doc(firestore, 'settings', 'system_settings'));
        const settings = settingsSnap.exists() ? settingsSnap.data() : { homepageCategoryMode: 'default' };
        const mode = settings.homepageCategoryMode || 'default';

        // 2. Fetch all categories
        const catsQuery = query(collection(firestore, 'categories'));
        const catsSnap = await getDocs(catsQuery);
        let allCats = catsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));

        // 3. Implement "Fill to 8" Logic
        let finalDisplayCats: Category[] = [];

        // Step 1: Add categories based on primary mode
        if (mode === 'manual') {
          finalDisplayCats = allCats.filter(cat => cat.showOnHomepage);
        } else if (mode === 'popular') {
          finalDisplayCats = allCats.filter(cat => cat.isPopular);
        } else {
          // Default: sort by order, then name
          finalDisplayCats = [...allCats].sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));
        }

        // Step 2: If less than 8, fill with other "Popular" categories not already included
        if (finalDisplayCats.length < 8) {
          const remainingPopular = allCats.filter(cat =>
            cat.isPopular && !finalDisplayCats.some(f => f.id === cat.id)
          );
          finalDisplayCats = [...finalDisplayCats, ...remainingPopular];
        }

        // Step 3: If still less than 8, fill with any remaining categories sorted by order
        if (finalDisplayCats.length < 8) {
          const remainder = allCats
            .filter(cat => !finalDisplayCats.some(f => f.id === cat.id))
            .sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));
          finalDisplayCats = [...finalDisplayCats, ...remainder];
        }

        // Final Slice: Exactly 8 (or all available if less than 8 total exist in DB)
        setCategories(finalDisplayCats.slice(0, 8));

      } catch (error) {
        console.error("Error fetching homepage categories:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomepageCategories();
  }, [firestore]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Fallback if no categories are found
  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="py-16 container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Browse by Category</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Explore our carefully curated categories to find exactly what you're looking for
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map((category) => (
          <Link key={category.id} href={category.href || `/browse?category=${category.name}`} className="h-full">
            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary h-full">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                <div className="p-3 rounded-full bg-primary/10 text-primary mb-4 group-hover:scale-110 transition-transform">
                  {getCategoryIcon(category.name)}
                </div>
                <h3 className="font-semibold mb-1">{category.name}</h3>
                <p className="text-xs text-muted-foreground">Explore →</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="text-center mt-12">
        <Button variant="outline" asChild>
          <Link href="/browse">View All Categories</Link>
        </Button>
      </div>
    </section>
  );
}

