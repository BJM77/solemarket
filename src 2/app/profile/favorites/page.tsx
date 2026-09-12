
'use client';

import { useFirebase, useCollection, useUser, useMemoFirebase } from '@/firebase';
import { collection, doc, getDocs, query, where, documentId } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import type { Product, WishlistItem } from '@/lib/types';
import ProductGrid from '@/components/products/ProductGrid';
import ProductGridSkeleton from '@/components/products/ProductGridSkeleton';
import { useRouter } from 'next/navigation';
import EmptyState from '@/components/ui/EmptyState';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function FavoritesTab() {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const router = useRouter();

  const favoritesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'users', user.uid, 'favorites');
  }, [firestore, user?.uid]);

  const { data: favoriteItems, isLoading: favoritesLoading } = useCollection<WishlistItem>(favoritesQuery);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.push('/sign-in?redirect=/profile/favorites');
      return;
    }

    const fetchFavoriteProducts = async () => {
      setLoadingFavorites(true);
      if (!favoriteItems || !firestore) {
        if (!favoritesLoading) {
          setLoadingFavorites(false);
          setFavoriteProducts([]);
        }
        return;
      }

      const favoriteIds = favoriteItems.map(fav => fav.id);

      if (favoriteIds.length === 0) {
        setFavoriteProducts([]);
        setLoadingFavorites(false);
        return;
      }

      try {
        const productChunks: Product[] = [];
        // Firestore 'in' query is limited to 30 items. We chunk the requests.
        for (let i = 0; i < favoriteIds.length; i += 30) {
          const chunkIds = favoriteIds.slice(i, i + 30);
          if (chunkIds.length === 0) continue;

          // Use documentId() to query by document ID
          const productsQuery = query(collection(firestore, 'products'), where(documentId(), 'in', chunkIds));
          const productDocs = await getDocs(productsQuery);
          
          const products = productDocs.docs
            .filter(docSnap => docSnap.exists())
            .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Product));
          productChunks.push(...products);
        }
        setFavoriteProducts(productChunks);
      } catch (error) {
        console.error("Error fetching favorite products:", error);
      } finally {
        setLoadingFavorites(false);
      }
    };

    fetchFavoriteProducts();
  }, [favoriteItems, firestore, favoritesLoading, user, isUserLoading, router]);

  const isLoading = isUserLoading || favoritesLoading || loadingFavorites;

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-6 font-headline">
        My Favorites
      </h1>
      {isLoading ? (
        <ProductGridSkeleton count={4} />
      ) : favoriteProducts.length > 0 ? (
        <ProductGrid products={favoriteProducts} />
      ) : (
        <EmptyState
          title="Your Favorites List is Empty"
          description="Browse our collections and click the heart icon to save items you love."
          icon={<Heart className="h-16 w-16 text-muted-foreground" />}
        >
          <Button asChild className="mt-6">
            <Link href="/browse">Start Browsing</Link>
          </Button>
        </EmptyState>
      )}
    </div>
  );
}
