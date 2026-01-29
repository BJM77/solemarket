
'use client';

import { useMemo, useEffect, useState } from 'react';
import { useFirebase, useCollection, useUser, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, orderBy, Timestamp, getDocs, updateDoc } from 'firebase/firestore';
import type { Product, Review } from '@/lib/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DollarSign,
  TrendingUp,
  Package,
  Star,
  Eye,
  Loader2,
  Upload,
  BarChart,
  ArrowUp,
  ArrowDown,
  MessageSquare,
} from 'lucide-react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';

function DashboardSkeleton() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  )
}

export default function SellerDashboard() {
  const router = useRouter();
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();

  const sellerIdQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'products'), where('sellerId', '==', user.uid), orderBy('createdAt', 'desc'));
  }, [firestore, user?.uid]);

  const userIdQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'products'), where('userId', '==', user.uid));
  }, [firestore, user?.uid]);

  const { data: sellerProducts, isLoading: sellerLoading } = useCollection<Product>(sellerIdQuery);
  const { data: userProducts, isLoading: userLoading } = useCollection<Product>(userIdQuery);

  const products = useMemo(() => {
    if (!sellerProducts && !userProducts) return [];

    // Combine products from both queries and remove duplicates by ID
    const combined = [...(sellerProducts || []), ...(userProducts || [])];
    const unique = Array.from(new Map(combined.map(p => [p.id, p])).values());

    // Ensure all products have a sellerId for consistency in the UI
    return unique.map(p => ({
      ...p,
      sellerId: p.sellerId || (p as any).userId
    })).sort((a, b) => {
      const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt as any).getTime();
      const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt as any).getTime();
      return dateB - dateA;
    });
  }, [sellerProducts, userProducts]);

  const productsLoading = sellerLoading || userLoading;

  const sellerReviewsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'reviews'), where('sellerId', '==', user.uid), orderBy('createdAt', 'desc'));
  }, [firestore, user?.uid]);

  const { data: reviews, isLoading: reviewsLoading } = useCollection<Review>(sellerReviewsQuery);

  const [mockConversionRate, setMockConversionRate] = useState(0);

  useEffect(() => {
    setTimeout(() => {
      setMockConversionRate(2.5 + Math.random() * 2);
    }, 0);
  }, []);

  const stats = useMemo(() => {
    if (!products || !reviews) {
      return {
        totalRevenue: 0,
        activeListings: 0,
        averageRating: 0,
        totalReviews: 0,
        totalViews: 0,
        conversionRate: 0,
      };
    }
    const totalRevenue = products.reduce((acc, p) => acc + p.price, 0);
    const activeListings = products.length;
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews : 0;
    const totalViews = products.reduce((acc, p) => acc + ((p as any).views || 0), 0);

    // This is a mock conversion rate as we don't track sales yet
    const conversionRate = activeListings > 0 ? mockConversionRate : 0;

    return { totalRevenue, activeListings, averageRating, totalReviews, totalViews, conversionRate };
  }, [products, reviews, mockConversionRate]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/sign-in?redirect=/sell/dashboard');
    }
  }, [isUserLoading, user, router]);

  if (isUserLoading || productsLoading || reviewsLoading || !user) {
    return <DashboardSkeleton />;
  }

  const statCards = [
    { label: 'Potential Revenue', value: `$${stats.totalRevenue.toFixed(2)}`, change: '+12.5%', icon: DollarSign, color: 'text-green-600 bg-green-100' },
    { label: 'Active Listings', value: stats.activeListings, change: '', icon: Package, color: 'text-blue-600 bg-blue-100' },
    { label: 'Conversion Rate', value: `${stats.conversionRate.toFixed(1)}%`, change: '+1.4%', icon: TrendingUp, color: 'text-purple-600 bg-purple-100' },
    { label: 'Seller Rating', value: `${stats.averageRating.toFixed(1)}/5`, change: `(${stats.totalReviews} reviews)`, icon: Star, color: 'text-yellow-600 bg-yellow-100' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user.displayName}! Here's your business overview.</p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <Button asChild>
              <Link href="/sell/create">
                <Upload className="h-4 w-4 mr-2" />
                New Listing
              </Link>
            </Button>
            <SyncListingsButton userId={user.uid} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`${stat.color} p-2 rounded-lg`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  {stat.change && <Badge variant={stat.change.startsWith('+') ? 'default' : 'secondary'} className="text-xs">{stat.change}</Badge>}
                </div>
                <div className="text-2xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Your Listings</CardTitle>
                <CardDescription>Manage your active product listings.</CardDescription>
              </CardHeader>
              <CardContent>
                {products && products.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Views</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Listed</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map(product => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="relative w-12 h-12 rounded-md overflow-hidden bg-muted">
                                <Image src={product.imageUrls[0]} alt={product.title} fill className="object-cover" />
                              </div>
                              <span className="font-medium line-clamp-2">{product.title}</span>
                            </div>
                          </TableCell>
                          <TableCell>${product.price.toFixed(2)}</TableCell>
                          <TableCell>{(product as any).views || 0}</TableCell>
                          <TableCell>
                            <Badge variant={product.status === 'draft' ? 'secondary' : 'default'} className={product.status === 'draft' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'}>
                              {product.status || 'Published'}
                            </Badge>
                          </TableCell>
                          <TableCell>{product.createdAt ? formatDistanceToNow(product.createdAt instanceof Timestamp ? product.createdAt.toDate() : product.createdAt, { addSuffix: true }) : 'N/A'}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/product/${product.id}`}>View</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>You have no active listings.</p>
                    <Button variant="outline" className="mt-4" asChild>
                      <Link href="/sell/create">Create Your First Listing</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Recent Reviews</CardTitle>
                <CardDescription>Your latest feedback from buyers.</CardDescription>
              </CardHeader>
              <CardContent>
                {reviews && reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.slice(0, 5).map(review => (
                      <div key={review.id} className="flex gap-3">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                          ))}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm line-clamp-2">{review.comment}</p>
                          <p className="text-xs text-muted-foreground mt-1">- {review.buyerName} on "{review.productTitle}"</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No reviews yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
function SyncListingsButton({ userId }: { userId: string }) {
  const { firestore } = useFirebase();
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    if (!firestore || !userId) return;
    setIsSyncing(true);
    try {
      // Find all products where userId matches
      const q = query(collection(firestore, 'products'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      let count = 0;

      const promises = snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const updates: any = {};

        // Fix missing sellerId
        if (!data.sellerId || data.sellerId !== userId) {
          updates.sellerId = userId;
        }

        // Fix missing isDraft for available listings
        if (data.status === 'available' && data.isDraft !== false) {
          updates.isDraft = false;
        }

        if (Object.keys(updates).length > 0) {
          await updateDoc(docSnap.ref, updates);
          count++;
        }
      });

      await Promise.all(promises);

      if (count > 0) {
        toast({ title: 'Sync Complete', description: `Successfully recovered and updated ${count} listings.` });
        window.location.reload();
      } else {
        toast({ title: 'Sync Finished', description: 'No missing data was found for your listings.' });
      }
    } catch (error: any) {
      console.error('Sync failed:', error);
      toast({ title: 'Sync Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleSync}
      disabled={isSyncing}
      className="border-primary text-primary hover:bg-primary/5"
    >
      {isSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <TrendingUp className="h-4 w-4 mr-2" />}
      Sync Listings
    </Button>
  );
}

import { useToast } from '@/hooks/use-toast';
