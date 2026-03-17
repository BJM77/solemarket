
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

import { updateEnquiryStatus, deleteProductsAction, activateProductAction } from '@/app/actions/product-updates';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2 } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';

export default function SellerDashboard() {
  const router = useRouter();
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const handleEnquiryAction = async (productId: string, newStatus: 'pending' | 'sold' | 'available') => {
    setIsUpdatingStatus(productId);
    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) throw new Error("Session expired");

      const result = await updateEnquiryStatus(productId, newStatus, idToken);
      if (result.success) {
        toast({ title: "Status Updated", description: `Listing marked as ${newStatus}.` });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message });
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const handleActivate = async (productId: string) => {
    setIsUpdatingStatus(productId);
    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) throw new Error("Session expired");
      const result = await activateProductAction(productId, idToken);
      if (result.success) {
        toast({ title: "Product Activated", description: "Listing is now live." });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Activation Failed", description: error.message });
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedProducts.length} listings?`)) return;
    
    setIsBulkDeleting(true);
    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) throw new Error("Session expired");
      const result = await deleteProductsAction(selectedProducts, idToken);
      if (result.success) {
        toast({ title: "Products Deleted", description: `Successfully deleted ${result.count} products.` });
        setSelectedProducts([]);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Deletion Failed", description: error.message });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const toggleAllSelection = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p.id));
    }
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const userRef = useMemoFirebase(() => user ? doc(firestore!, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<any>(userRef);


  const sellerIdQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'products'), where('sellerId', '==', user.uid));
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

  const guestEnquiriesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'guest_enquiries'), where('sellerId', '==', user.uid));
  }, [firestore, user?.uid]);

  const { data: rawOrders, isLoading: ordersLoading } = useCollection<any>(sellerOrdersQuery);
  const { data: guestEnquiries, isLoading: enquiriesLoading } = useCollection<any>(guestEnquiriesQuery);

  const orders = useMemo(() => {
    return [...(rawOrders || []), ...(guestEnquiries || [])];
  }, [rawOrders, guestEnquiries]);

  const products = useMemo(() => {
    if (!sellerProducts && !userProducts) return [];

    // Combine products from both queries and remove duplicates by ID
    const combined = [...(sellerProducts || []), ...(userProducts || [])];
    const unique = Array.from(new Map(combined.map((p: Product) => [p.id, p])).values());

    // Ensure all products have a sellerId for consistency in the UI
    return unique.map((p: Product) => ({
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
    return query(collection(firestore, 'reviews'), where('sellerId', '==', user.uid));
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

    const activeListings = products.filter((p: Product) => !['sold', 'draft', 'deleted'].includes(p.status || '')).length;
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 ? reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / totalReviews : 0;
    
    // Only count views for non-deleted products to keep stats clean
    const totalViews = products
      .filter((p: Product) => p.status !== 'deleted')
      .reduce((acc: number, p: Product) => acc + ((p as any).views || 0), 0);
      
    const orderCount = orders.length;

    const soldCount = products.filter((p: Product) => p.status === 'sold').length;

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

  if (isUserLoading || profileLoading || productsLoading || reviewsLoading || ordersLoading || enquiriesLoading || !user) {
    return <DashboardSkeleton />;
  }

  // Onboarding screens - now following Dark Theme protocol
  if (!userProfile?.agreementAccepted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8 bg-card border-white/5 shadow-2xl">
          <div className="bg-primary/10 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <Package className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-black text-white mb-4">Become a Seller</h2>
          <p className="text-slate-400 mb-8 font-medium">Start your business on Benched today. List your cards, coins, and collectibles to millions of buyers.</p>
          <Button asChild size="lg" className="w-full font-black uppercase rounded-xl shadow-glow">
            <Link href="/seller/agreement">Review Agreement</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (userProfile?.sellerStatus === 'pending') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8 bg-card border-white/5">
          <div className="bg-amber-950/20 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
            <Clock className="h-10 w-10 text-amber-500" />
          </div>
          <h2 className="text-2xl font-black text-white mb-4">Application Pending</h2>
          <p className="text-slate-400 mb-8 font-medium">We've received your application! Our team is reviewing it. This usually takes 24-48 hours. We'll notify you once you're approved.</p>
          <Button variant="outline" className="w-full font-bold border-white/10 hover:bg-white/5 rounded-xl" asChild>
            <Link href="/">Back to Marketplace</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (userProfile?.sellerStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8 border-red-500/20 bg-card">
          <div className="bg-red-950/20 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 border border-red-500/20">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-white mb-4">Application Declined</h2>
          <p className="text-slate-400 mb-8 font-medium">Unfortunately, your seller application was not approved at this time. Please contact support for more details.</p>
          <Button variant="outline" className="w-full font-bold border-white/10 hover:bg-white/5 rounded-xl" asChild>
            <Link href="/contact">Contact Support</Link>
          </Button>
        </Card>
      </div>
    );
  }


  const statCards = [
    // { label: 'Realized Revenue', value: `$${formatPrice(stats.totalRevenue)}`, change: '+8.2%', icon: DollarSign, color: 'text-emerald-500 bg-emerald-500/10' },
    { label: 'Active Enquiries', value: stats.orderCount, change: '', icon: Truck, color: 'text-blue-500 bg-blue-500/10' },
    { label: 'Market Visibility', value: stats.totalViews.toLocaleString(), change: '', icon: Eye, color: 'text-indigo-500 bg-indigo-500/10' },
    { label: 'Engagement Rate', value: `${stats.conversionRate.toFixed(1)}%`, change: '', icon: TrendingUp, color: 'text-orange-500 bg-orange-500/10' },
    { label: 'Active Inventory', value: stats.activeListings, change: '', icon: Package, color: 'text-purple-500 bg-purple-500/10' },
    { label: 'Network Reputation', value: `${typeof stats.averageRating === 'number' ? stats.averageRating.toFixed(1) : '0.0'}/5`, change: `(${stats.totalReviews} ratings)`, icon: Star, color: 'text-amber-500 bg-amber-500/10' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="bg-card/50 backdrop-blur-md border-b border-white/5 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-black text-[10px] uppercase px-3 py-1">
                  Secure Protocol Active
                </Badge>
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-white">
                Seller <span className="text-primary italic">Terminal</span>
              </h1>
              <p className="text-slate-400 font-medium text-sm mt-1">Authorized access for {userProfile?.displayName || user?.email}</p>
            </div>
            
            <div className="flex items-center gap-3 mt-4 md:mt-0">
              <Button className="rounded-xl font-bold px-6 shadow-glow transition-all hover:scale-105" asChild>
                <Link href="/sell/create">
                  <Upload className="mr-2 h-4 w-4" /> Deploy Listing
                </Link>
              </Button>
              <SyncListingsButton userId={user.uid} />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">

        <Tabs defaultValue="overview" className="space-y-12">
          <div className="flex items-center justify-between overflow-x-auto pb-2 no-scrollbar">
            <TabsList className="bg-card border border-white/5 p-1.5 rounded-2xl h-14">
              <TabsTrigger value="overview" className="rounded-xl px-8 font-bold data-[state=active]:bg-primary data-[state=active]:text-black h-full transition-all">
                System Overview
              </TabsTrigger>
              <TabsTrigger value="products" className="rounded-xl px-8 font-bold data-[state=active]:bg-primary data-[state=active]:text-black h-full transition-all">
                Product Catalog
              </TabsTrigger>
              <TabsTrigger value="orders" className="rounded-xl px-8 font-bold data-[state=active]:bg-primary data-[state=active]:text-black h-full transition-all flex items-center gap-2">
                Enquiries {orders && orders.length > 0 && <span className="bg-black/20 px-2 py-0.5 rounded-md text-[10px]">{orders.length}</span>}
              </TabsTrigger>
              {/* <TabsTrigger value="financials" className="rounded-xl px-8 font-bold data-[state=active]:bg-primary data-[state=active]:text-black h-full transition-all">
                Revenue Infrastructure
              </TabsTrigger> */}
              <TabsTrigger value="reviews" className="rounded-xl px-8 font-bold data-[state=active]:bg-primary data-[state=active]:text-black h-full transition-all">
                Feedback Loop
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-12">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
              {statCards.map((stat, index) => (
                <Card key={index} className="border border-white/5 bg-card/50 backdrop-blur-sm shadow-2xl transition-all duration-300 hover:border-primary/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`${stat.color} p-2.5 rounded-xl border border-white/5 shadow-inner`}>
                        <stat.icon className="h-5 w-5" />
                      </div>
                      {stat.change && <Badge variant="outline" className="text-[10px] uppercase font-black bg-primary/10 text-primary border-primary/20">{stat.change}</Badge>}
                    </div>
                    <div className="text-3xl font-black mb-1 text-white tabular-nums">{stat.value}</div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border border-white/5 bg-card/50 overflow-hidden rounded-2xl shadow-2xl">
              <CardHeader className="pb-4 bg-slate-900/50 backdrop-blur-md border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-black text-white uppercase tracking-tight">Listing Capacity Plan</CardTitle>
                    <CardDescription className="text-slate-400 font-medium">You have consumed {stats.activeListings} of your {listingLimit} authorized units.</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" className="text-white border-white/20 hover:bg-white/10 rounded-lg font-bold">
                    Upgrade Capability
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-8">
                <div className="space-y-4">
                  <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                    <span className="text-slate-500">Utilization Rate</span>
                    <span className="text-primary">{Math.round(listingProgress)}% deployed</span>
                  </div>
                  <Progress value={listingProgress} className="h-3 bg-white/5 overflow-hidden rounded-full shadow-inner" />
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest pt-2">
                    <span>{stats.activeListings} Allocated</span>
                    <span>{listingLimit} Max capacity</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-2 border border-white/5 bg-card/50 rounded-2xl overflow-hidden shadow-2xl">
                <CardHeader className="border-b border-white/5 bg-slate-900/30">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-black text-white uppercase">Critical Fulfillment</CardTitle>
                    <Button variant="ghost" size="sm" className="font-bold text-primary hover:bg-primary/10" onClick={() => { }}>Access Full Feed</Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <SellerOrders limit={3} />
                </CardContent>
              </Card>

              <Card className="border border-white/5 bg-card/50 rounded-2xl overflow-hidden shadow-2xl">
                <CardHeader className="border-b border-white/5 bg-slate-900/30">
                  <CardTitle className="text-lg font-black text-white uppercase">Reputation Loop</CardTitle>
                </CardHeader>
                <CardContent className="pt-8">
                  {reviews && reviews.length > 0 ? (
                    <div className="space-y-8">
                      {reviews.slice(0, 3).map(review => (
                        <div key={review.id} className="space-y-3 relative pl-6 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary/20 before:rounded-full">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'text-primary fill-primary' : 'text-slate-800'}`} />
                              ))}
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">{format(review.createdAt instanceof Timestamp ? review.createdAt.toDate() : new Date(review.createdAt as any), 'MMM d')}</span>
                          </div>
                          <p className="text-sm font-medium text-slate-300 line-clamp-2 italic leading-relaxed">"{review.comment}"</p>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">— {review.buyerName}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-600">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-10" />
                      <p className="font-black uppercase text-xs tracking-widest">Awaiting Transmissions</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products">
            <Card className="border border-white/5 bg-card/50 rounded-2xl overflow-hidden shadow-2xl">
              <CardHeader className="bg-slate-900/30 border-b border-white/5 py-8">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-black text-white uppercase tracking-tighter">Product Inventory</CardTitle>
                    <CardDescription className="text-slate-400 font-medium">Global control of your marketplace assets.</CardDescription>
                  </div>
                  {selectedProducts.length > 0 && (
                    <div className="flex items-center gap-3 bg-red-950/20 border border-red-500/20 p-2.5 px-5 rounded-2xl animate-in fade-in slide-in-from-top-2 shadow-2xl backdrop-blur-sm">
                      <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">{selectedProducts.length} Selected</span>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="h-9 font-black uppercase text-[10px] bg-red-600 hover:bg-red-700 px-6 rounded-xl shadow-glow-red"
                        onClick={handleBulkDelete}
                        disabled={isBulkDeleting}
                      >
                        {isBulkDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                        Execute Deletion
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 font-black uppercase text-[10px] text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                        onClick={() => setSelectedProducts([])}
                      >
                        Abort
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {products && products.length > 0 ? (
                  <Table>
                    <TableHeader className="bg-white/5">
                      <TableRow className="border-white/5">
                        <TableHead className="w-12 pl-6">
                          <Checkbox 
                            checked={selectedProducts.length === products.length && products.length > 0}
                            onCheckedChange={toggleAllSelection}
                            className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:text-black"
                          />
                        </TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-slate-400">Product</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-slate-400">Price</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-slate-400">Intelligence</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-slate-400">Status</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-slate-400">Timestamp</TableHead>
                        <TableHead className="text-right pr-6 font-black text-[10px] uppercase text-slate-400">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map(product => (
                        <TableRow key={product.id} className={cn(
                          "hover:bg-white/5 transition-colors border-white/5",
                          selectedProducts.includes(product.id) && "bg-primary/5"
                        )}>
                          <TableCell className="pl-6">
                            <Checkbox 
                              checked={selectedProducts.includes(product.id)}
                              onCheckedChange={() => toggleProductSelection(product.id)}
                              className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:text-black"
                            />
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-4">
                              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white/5 border border-white/5">
                                <Image src={product.imageUrls[0]} alt={product.title} fill className="object-cover" />
                              </div>
                              <span className="font-bold text-white line-clamp-1 max-w-[200px]">{product.title}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-white">{formatPrice(product.price)}</TableCell>
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
                                product.status === 'draft' ? 'bg-slate-800 text-slate-400' : 'bg-emerald-950/40 text-emerald-500'
                              )}
                            >
                              {product.status || 'Active'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-medium text-slate-500">
                            {product.createdAt ? formatDistanceToNow(product.createdAt instanceof Timestamp ? product.createdAt.toDate() : product.createdAt, { addSuffix: true }) : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-2">
                              {(product as any).enquiryStatus === 'enquired' || (product as any).enquiryStatus === 'pending' ? (
                                <div className="flex items-center gap-1 bg-white/5 backdrop-blur-md p-1 rounded-xl border border-white/5">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-7 text-[10px] font-black uppercase bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20"
                                    onClick={() => handleEnquiryAction(product.id, 'pending')}
                                    disabled={isUpdatingStatus === product.id || (product as any).enquiryStatus === 'pending'}
                                  >
                                    Pending
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-7 text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20"
                                    onClick={() => handleEnquiryAction(product.id, 'sold')}
                                    disabled={isUpdatingStatus === product.id}
                                  >
                                    Sold
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 text-[10px] font-black uppercase text-slate-400 hover:text-white hover:bg-white/5"
                                    onClick={() => handleEnquiryAction(product.id, 'available')}
                                    disabled={isUpdatingStatus === product.id}
                                  >
                                    Relist
                                  </Button>
                                </div>
                              ) : (
                                <Button variant="ghost" size="sm" className="font-bold rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all" asChild>
                                  <Link href={`/product/${product.id}`}>Inspect</Link>
                                </Button>
                              )}
                              {product.status === 'draft' && (
                                <Button 
                                  variant="default" 
                                  size="sm" 
                                  className="font-black text-[10px] uppercase bg-emerald-600 hover:bg-emerald-700 h-8 rounded-lg"
                                  onClick={() => handleActivate(product.id)}
                                  disabled={isUpdatingStatus === product.id}
                                >
                                  {isUpdatingStatus === product.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                                  Activate
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-32 bg-card/30 backdrop-blur-sm">
                    <Package className="h-20 w-20 mx-auto mb-6 opacity-5 text-primary" />
                    <p className="font-black text-2xl text-white uppercase tracking-tighter">No Listings Found</p>
                    <p className="text-slate-500 font-medium mt-2 max-w-xs mx-auto">Your inventory is currently empty. Initiate your first market entry to begin operations.</p>
                    <Button className="mt-8 rounded-xl font-black uppercase px-8 h-12 shadow-glow" asChild>
                      <Link href="/sell/create">Deploy New Listing</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-8">
            <Card className="border border-white/5 bg-card/50 rounded-2xl overflow-hidden shadow-2xl">
              <CardHeader className="bg-slate-900/30 border-b border-white/5 py-8">
                <CardTitle className="text-2xl font-black text-white uppercase tracking-tighter">Deal Enquiries</CardTitle>
                <CardDescription className="text-slate-400 font-medium">Manage your buyer messages and payment arrangements here.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <SellerOrders />
              </CardContent>
            </Card>
          </TabsContent>

          {/* <TabsContent value="financials" className="space-y-12">
            <div className="space-y-6">
...
              <SubscriptionTier currentPlan={userProfile?.plan || 'base'} />
            </div>
          </TabsContent> */}

          <TabsContent value="reviews">
            <Card className="border border-white/5 shadow-2xl rounded-2xl overflow-hidden bg-card/50">
              <CardHeader className="bg-slate-900/30 border-b border-white/5 py-8">
                <CardTitle className="text-2xl font-black text-white uppercase tracking-tighter">Identity Reputation</CardTitle>
                <CardDescription className="text-slate-400 font-medium">Your global trust score across the decentralized marketplace.</CardDescription>
              </CardHeader>
              <CardContent>
                {reviews && reviews.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {reviews.map(review => (
                      <div key={review.id} className="p-8 rounded-3xl border border-white/5 bg-slate-900/40 space-y-4 hover:border-primary/20 transition-all duration-300">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'text-primary fill-primary' : 'text-slate-800'}`} />
                            ))}
                          </div>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{format(review.createdAt instanceof Timestamp ? review.createdAt.toDate() : new Date(review.createdAt as any), 'MMM d, yyyy')}</span>
                        </div>
                        <p className="text-slate-300 font-medium italic text-sm leading-relaxed">"{review.comment}"</p>
                        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xs text-primary font-black uppercase">{review.buyerName[0]}</div>
                            <span className="text-xs font-bold text-white uppercase tracking-tight">{review.buyerName}</span>
                          </div>
                          <span className="text-[10px] font-black text-slate-500 uppercase">{review.productTitle}</span>
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

      const promises = snapshot.docs.map(async (docSnap: any) => {
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

