
'use client';

import { useMemo, useEffect, useState } from 'react';
import { useFirebase, useCollection, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, orderBy, Timestamp, getDocs, updateDoc, doc } from 'firebase/firestore';

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
  AlertCircle,
  Clock,
  CheckCircle,
  Truck,
} from 'lucide-react';


import Image from 'next/image';
import { formatDistanceToNow, format } from 'date-fns';
import { formatPrice, cn } from '@/lib/utils';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SellerOrders } from '@/components/seller/SellerOrders';
import { SubscriptionTier } from '@/components/seller/SubscriptionTier';
import { StripeConnect } from '@/components/seller/StripeConnect';

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
  const userRef = useMemoFirebase(() => user ? doc(firestore!, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<any>(userRef);


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

  const sellerOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'orders'), where('sellerId', '==', user.uid));
  }, [firestore, user?.uid]);

  const { data: orders, isLoading: ordersLoading } = useCollection<any>(sellerOrdersQuery);

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



  const stats = useMemo(() => {
    if (!products || !reviews || !orders) {
      return {
        totalRevenue: 0,
        activeListings: 0,
        averageRating: 0,
        totalReviews: 0,
        totalViews: 0,
        conversionRate: 0,
        orderCount: 0,
      };
    }

    // Revenue from completed or shipped orders
    const totalRevenue = orders
      .filter((o: any) => o.status !== 'cancelled')
      .reduce((acc: number, o: any) => acc + (o.totalAmount || 0), 0);

    const activeListings = products.filter(p => !['sold', 'draft'].includes(p.status || '')).length;
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews : 0;
    const totalViews = products.reduce((acc, p) => acc + ((p as any).views || 0), 0);
    const orderCount = orders.length;

    const soldCount = products.filter(p => p.status === 'sold').length;

    // Real conversion rate calculation
    const conversionRate = totalViews > 0 ? (soldCount / totalViews) * 100 : 0;

    return { totalRevenue, activeListings, averageRating, totalReviews, totalViews, conversionRate, orderCount };
  }, [products, reviews, orders]);

  const listingLimit = userProfile?.listingLimit || 40;
  const listingProgress = (products.length / listingLimit) * 100;

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/sign-in?redirect=/sell/dashboard');
    }
  }, [isUserLoading, user, router]);

  if (isUserLoading || profileLoading || productsLoading || reviewsLoading || ordersLoading || !user) {
    return <DashboardSkeleton />;
  }

  // Onboarding screens
  if (!userProfile?.agreementAccepted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="bg-primary/10 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <Package className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-4">Become a Seller</h2>
          <p className="text-slate-600 mb-8">Start your business on Benched today. Lists your cards, coins, and collectibles to millions of buyers.</p>
          <Button asChild size="lg" className="w-full">
            <Link href="/seller/agreement">Review Agreement</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (userProfile?.sellerStatus === 'pending') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="bg-yellow-100 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <Clock className="h-10 w-10 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-4">Application Pending</h2>
          <p className="text-slate-600 mb-8">We've received your application! Our team is reviewing it. This usually takes 24-48 hours. We'll notify you once you're approved.</p>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/">Back to Marketplace</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (userProfile?.sellerStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8 border-red-200">
          <div className="bg-red-100 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-4">Application Declined</h2>
          <p className="text-slate-600 mb-8">Unfortunately, your seller application was not approved at this time. Please contact support for more details.</p>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/contact">Contact Support</Link>
          </Button>
        </Card>
      </div>
    );
  }


  const statCards = [
    { label: 'Realized Revenue', value: `$${formatPrice(stats.totalRevenue)}`, change: '+8.2%', icon: DollarSign, color: 'text-emerald-600 bg-emerald-100' },
    { label: 'Order Volume', value: stats.orderCount, change: '', icon: Truck, color: 'text-blue-600 bg-blue-100' },
    { label: 'Active Inventory', value: stats.activeListings, change: '', icon: Package, color: 'text-purple-600 bg-purple-100' },
    { label: 'Network Reputation', value: `${typeof stats.averageRating === 'number' ? stats.averageRating.toFixed(1) : '0.0'}/5`, change: `(${stats.totalReviews} transmissions)`, icon: Star, color: 'text-amber-600 bg-amber-100' },
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

        <Tabs defaultValue="overview" className="space-y-8">
          <div className="flex items-center justify-between">
            <TabsList className="bg-white border shadow-sm p-1 rounded-xl">
              <TabsTrigger value="overview" className="rounded-lg px-6 font-bold data-[state=active]:bg-slate-900 data-[state=active]:text-white">Overview</TabsTrigger>
              <TabsTrigger value="products" className="rounded-lg px-6 font-bold data-[state=active]:bg-slate-900 data-[state=active]:text-white">Products</TabsTrigger>
              <TabsTrigger value="orders" className="rounded-lg px-6 font-bold data-[state=active]:bg-slate-900 data-[state=active]:text-white">Orders</TabsTrigger>
              <TabsTrigger value="financials" className="rounded-lg px-6 font-bold data-[state=active]:bg-slate-900 data-[state=active]:text-white">Financials</TabsTrigger>
              <TabsTrigger value="reviews" className="rounded-lg px-6 font-bold data-[state=active]:bg-slate-900 data-[state=active]:text-white">Reviews</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {statCards.map((stat, index) => (
                <Card key={index} className="border-none shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`${stat.color} p-2.5 rounded-xl`}>
                        <stat.icon className="h-5 w-5" />
                      </div>
                      {stat.change && <Badge variant={stat.change.startsWith('+') ? 'default' : 'secondary'} className="text-[10px] uppercase font-black">{stat.change}</Badge>}
                    </div>
                    <div className="text-3xl font-black mb-1">{stat.value}</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-none shadow-sm overflow-hidden rounded-2xl">
              <CardHeader className="pb-4 bg-slate-900 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold">Listing Tier Status</CardTitle>
                    <CardDescription className="text-slate-400">You have used {stats.activeListings} of your {listingLimit} authorized listings.</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" className="text-white border-white/20 hover:bg-white/10 rounded-lg">
                    Upgrade Capability
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <Progress value={listingProgress} className="h-3 bg-slate-100" />
                  <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                    <span>{stats.activeListings} Allocated</span>
                    <span>{listingLimit} Max Capacity</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-2 border-none shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="border-b bg-white">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold">Recent Fulfillment</CardTitle>
                    <Button variant="ghost" size="sm" className="font-bold text-primary" onClick={() => { }}>View All Orders</Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <SellerOrders limit={3} />
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="border-b bg-white">
                  <CardTitle className="text-lg font-bold">Feedback Loop</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {reviews && reviews.length > 0 ? (
                    <div className="space-y-6">
                      {reviews.slice(0, 3).map(review => (
                        <div key={review.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`} />
                              ))}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{format(review.createdAt instanceof Timestamp ? review.createdAt.toDate() : new Date(review.createdAt as any), 'MMM d')}</span>
                          </div>
                          <p className="text-sm font-medium text-slate-700 line-clamp-2 italic">"{review.comment}"</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase">— {review.buyerName}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-10" />
                      <p className="font-bold">No Feedback Received</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products">
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-white border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold">Product Catalog</CardTitle>
                    <CardDescription>Manage your inventory and availability.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {products && products.length > 0 ? (
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="border-none">
                        <TableHead className="font-black text-[10px] uppercase text-slate-400 pl-6">Product</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-slate-400">Price</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-slate-400">Intelligence</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-slate-400">Status</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-slate-400">Timestamp</TableHead>
                        <TableHead className="text-right pr-6 font-black text-[10px] uppercase text-slate-400">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map(product => (
                        <TableRow key={product.id} className="hover:bg-slate-50/50 transition-colors border-slate-50">
                          <TableCell className="pl-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
                                <Image src={product.imageUrls[0]} alt={product.title} fill className="object-cover" />
                              </div>
                              <span className="font-bold text-slate-900 line-clamp-1 max-w-[200px]">{product.title}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-slate-900">{formatPrice(product.price)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                              <Eye className="h-3 w-3" />
                              {(product as any).views || 0} views
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-black text-[10px] uppercase tracking-tighter px-3 py-1 border-none",
                                product.status === 'draft' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'
                              )}
                            >
                              {product.status || 'Active'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-medium text-slate-500">
                            {product.createdAt ? formatDistanceToNow(product.createdAt instanceof Timestamp ? product.createdAt.toDate() : product.createdAt, { addSuffix: true }) : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button variant="ghost" size="sm" className="font-bold rounded-lg" asChild>
                              <Link href={`/product/${product.id}`}>Inspect</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-20 text-slate-400">
                    <Package className="h-16 w-16 mx-auto mb-4 opacity-10" />
                    <p className="font-bold text-lg text-slate-600">No Listings Protocol Found</p>
                    <p className="text-sm mt-1">Initiate your first market entry now.</p>
                    <Button className="mt-6 rounded-xl font-bold" asChild>
                      <Link href="/sell/create">Create New Listing</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <SellerOrders />
          </TabsContent>

          <TabsContent value="financials" className="space-y-12">
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-1.5 bg-primary rounded-full" />
                <h2 className="text-2xl font-black text-slate-900">Revenue Infrastructure</h2>
              </div>
              <StripeConnect
                stripeEnabled={userProfile?.stripeEnabled}
                stripeAccountId={userProfile?.stripeAccountId}
              />
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-1.5 bg-primary rounded-full" />
                <h2 className="text-2xl font-black text-slate-900">Subscription Protocol</h2>
              </div>
              <SubscriptionTier currentPlan={userProfile?.plan || 'base'} />
            </div>
          </TabsContent>

          <TabsContent value="reviews">
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Comprehensive Feedback</CardTitle>
                <CardDescription>Your reputation score across the network.</CardDescription>
              </CardHeader>
              <CardContent>
                {reviews && reviews.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {reviews.map(review => (
                      <div key={review.id} className="p-6 rounded-2xl border border-slate-50 bg-slate-50/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`} />
                            ))}
                          </div>
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{format(review.createdAt instanceof Timestamp ? review.createdAt.toDate() : new Date(review.createdAt as any), 'MMM d, yyyy')}</span>
                        </div>
                        <p className="text-slate-700 font-medium italic">"{review.comment}"</p>
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-[10px] text-white font-bold uppercase">{review.buyerName[0]}</div>
                            <span className="text-xs font-bold text-slate-900">{review.buyerName}</span>
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase">{review.productTitle}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <Star className="h-16 w-16 mx-auto mb-4 opacity-10 text-slate-400" />
                    <p className="font-bold text-slate-400">No Review Transmissions Received</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
