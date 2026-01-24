
'use client';

import { useFirebase, useCollection, useUser, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Product } from '@/lib/types';
import ProductGrid from '@/components/products/ProductGrid';
import { Button } from '@/components/ui/button';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { ShoppingBag, Upload } from 'lucide-react';
import { useEffect } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import ProductGridSkeleton from '@/components/products/ProductGridSkeleton';

export default function MyListingsPage() {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/sign-in?redirect=/profile/listings');
    }
  }, [isUserLoading, user, router]);

  const userProductsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'products'),
      where('sellerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user?.uid]);

  const { data: userProducts, isLoading: productsLoading } =
    useCollection<Product>(userProductsQuery);

  if (isUserLoading || productsLoading) {
    return (
        <div>
             <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold tracking-tight font-headline">
                    My Listings
                </h1>
                 <Button asChild>
                    <Link href="/sell/create">
                        <Upload className="h-4 w-4 mr-2" />
                        New Listing
                    </Link>
                </Button>
            </div>
            <ProductGridSkeleton count={3} />
        </div>
    );
  }

  if (!user) {
     return null;
  }

  return (
    <div>
        <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold tracking-tight font-headline">
                My Listings
            </h1>
            <Button asChild>
                <Link href="/sell/create">
                    <Upload className="h-4 w-4 mr-2" />
                    New Listing
                </Link>
            </Button>
        </div>
        {userProducts && userProducts.length > 0 ? (
            <ProductGrid products={userProducts} />
        ) : (
            <EmptyState
                title="You haven't listed any items"
                description="Start selling your collectibles to see them here."
                icon={<ShoppingBag className="h-16 w-16 text-muted-foreground" />}
            >
                <Button asChild>
                    <Link href="/sell/create">Create Your First Listing</Link>
                </Button>
            </EmptyState>
        )}
    </div>
  );
}
