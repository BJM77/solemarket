
'use client';

import { useMemo, useEffect, useState } from 'react';
import { useFirebase, useCollection, useUser, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
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
  Edit,
  Trash2,
  CheckCircle,
  PlusCircle,
  RotateCcw,
  HelpCircle,
  MoreVertical,
} from 'lucide-react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { formatPrice, safeDate } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { markAsSold, deleteListing, updateListing, republishListing } from '@/app/actions/seller-actions';
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { ListingForm } from '@/components/sell/ListingForm';
import ProductQuickView from '@/components/products/ProductQuickView';
import { BrandRequestModal } from '@/components/sell/BrandRequestModal';

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

  const userProductsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'products'), where('sellerId', '==', user.uid));
  }, [firestore, user?.uid]);

  const { data: products, isLoading: productsLoading } = useCollection<Product>(userProductsQuery);

  const sellerReviewsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'reviews'), where('sellerId', '==', user.uid));
  }, [firestore, user?.uid]);

  const { data: reviews, isLoading: reviewsLoading } = useCollection<Review>(sellerReviewsQuery);



  const { toast } = useToast();
  const [isSoldDialogOpen, setIsSoldDialogOpen] = useState(false);
  const [selectedProductForSold, setSelectedProductForSold] = useState<Product | null>(null);
  const [fulfillmentType, setFulfillmentType] = useState<string>('platform');
  const [actionLoading, setActionLoading] = useState(false);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);


  const handleMarkAsSold = async () => {
    if (!selectedProductForSold || !user) return;
    setActionLoading(true);
    try {
      const idToken = await user.getIdToken();
      const result = await markAsSold(idToken, selectedProductForSold.id, fulfillmentType);
      if (result.success) {
        toast({ title: "Success", description: "Listing marked as sold." });
        setIsSoldDialogOpen(false);
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this listing?") || !user) return;
    try {
      const idToken = await user.getIdToken();
      const result = await deleteListing(idToken, productId);
      if (result.success) {
        toast({ title: "Success", description: "Listing deleted." });
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const activeProducts = useMemo(() => products?.filter(p => !p.status || p.status === 'available' || p.status === 'draft' || p.status === 'pending_approval' || p.status === 'on_hold') || [], [products]);
  const soldProducts = useMemo(() => products?.filter(p => p.status === 'sold') || [], [products]);

  const stats = useMemo(() => {
    if (!products || !reviews) {
      return {
        totalRevenue: 0,
        actualRevenue: 0,
        activeListings: 0,
        averageRating: 0,
        totalReviews: 0,
        totalViews: 0,
        conversionRate: 0,
      };
    }
    const totalRevenue = activeProducts.reduce((acc, p) => acc + Number(p.price || 0), 0);
    const actualRevenue = soldProducts.reduce((acc, p) => acc + Number(p.price || 0), 0);
    const activeListings = activeProducts.length;
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews : 0;
    const totalViews = products.reduce((acc, p) => acc + ((p as any).views || 0), 0);


    // Real conversion rate: Sold / Total Views
    const conversionRate = totalViews > 0 ? (soldProducts.length / totalViews) * 100 : 0;

    return { totalRevenue, actualRevenue, activeListings, averageRating, totalReviews, totalViews, conversionRate };
  }, [products, reviews, activeProducts, soldProducts]);



  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/sign-in?redirect=/sell/dashboard');
    }
  }, [isUserLoading, user, router]);

  if (isUserLoading || productsLoading || reviewsLoading || !user) {
    return <DashboardSkeleton />;
  }

  const statCards = [
    { label: 'Potential Revenue', value: `$${formatPrice(stats.totalRevenue)}`, change: '', icon: DollarSign, color: 'text-orange-600 bg-orange-100' },
    { label: 'Total Earnings', value: `$${formatPrice(stats.actualRevenue)}`, change: '', icon: DollarSign, color: 'text-green-600 bg-green-100' },
    { label: 'Active Listings', value: stats.activeListings, change: '', icon: Package, color: 'text-blue-600 bg-blue-100' },
    { label: 'Seller Rating', value: `${typeof stats.averageRating === 'number' ? stats.averageRating.toFixed(1) : '0.0'}/5`, change: `(${stats.totalReviews} reviews)`, icon: Star, color: 'text-yellow-600 bg-yellow-100' },
  ];




  const handleRepublish = async (product: Product) => {
    if (!user) return;
    try {
      setActionLoading(true);
      const idToken = await user.getIdToken();
      const result = await republishListing(idToken, product.id);

      if (result.success) {
        toast({
          title: "Listing Republished",
          description: "Your listing is now active again.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to republish listing.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12">
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Seller Console</h1>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-slate-500 font-medium">Market Protocol Active • {user.displayName}</p>
            </div>
          </div>
          <Button asChild className="rounded-xl font-black uppercase h-12 px-6 shadow-glow">
            <Link href="/sell/create">
              <PlusCircle className="h-5 w-5 mr-2" />
              Deploy Listing
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {statCards.map((stat, index) => (
            <Card key={index} className="bg-card/50 border-white/5 shadow-2xl overflow-hidden group hover:border-primary/20 transition-all duration-300">
              <CardContent className="pt-8 relative">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <stat.icon className="h-16 w-16" />
                </div>
                <div className="flex items-center justify-between mb-6">
                  <div className={`p-3 rounded-2xl bg-white/5 border border-white/10 ${stat.color.split(' ')[0]}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                  {stat.change && <Badge variant="secondary" className="bg-white/5 text-slate-400 border-none font-bold">{stat.change}</Badge>}
                </div>
                <div className="text-3xl font-black text-white mb-1 tracking-tight">{stat.value}</div>
                <div className="text-sm text-slate-500 font-bold uppercase tracking-wider">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs defaultValue="active" className="w-full space-y-6">
              <TabsList className="bg-card/50 border border-white/5 p-1 rounded-xl h-12">
                <TabsTrigger 
                  value="active" 
                  className="rounded-lg px-6 font-bold data-[state=active]:bg-primary data-[state=active]:text-black"
                >
                  Active <span className="ml-2 opacity-50 px-1.5 py-0.5 bg-black/10 rounded-md text-[10px]">{activeProducts.length}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="sold" 
                  className="rounded-lg px-6 font-bold data-[state=active]:bg-primary data-[state=active]:text-black"
                >
                  Sold <span className="ml-2 opacity-50 px-1.5 py-0.5 bg-black/10 rounded-md text-[10px]">{soldProducts.length}</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active">
                <Card className="bg-card/50 border-white/5 shadow-2xl overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-white/5 bg-white/5">
                    <div className="space-y-1">
                      <CardTitle className="text-xl font-black text-white uppercase tracking-tight">Active Inventory</CardTitle>
                      <CardDescription className="text-slate-500 font-medium">Manage your currently live market entries.</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {activeProducts.length > 0 ? (
                      <Table>
                        <TableHeader className="bg-white/5">
                          <TableRow className="hover:bg-transparent border-white/5">
                            <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-widest pl-6">Product</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Price</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Views</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Listed</TableHead>
                            <TableHead className="text-right text-slate-400 font-bold uppercase text-[10px] tracking-widest pr-6">Status • Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeProducts.map(product => (
                            <TableRow key={product.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                              <TableCell className="pl-6 py-4">
                                <div className="flex items-center gap-4">
                                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-900 border border-white/5 shadow-inner">
                                    <Image src={product.imageUrls[0]} alt={product.title} fill sizes="56px" className="object-cover group-hover:scale-110 transition-transform duration-500" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-bold text-white line-clamp-1">{product.title}</span>
                                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-tighter mt-0.5">{product.category}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="font-black text-white text-lg">${formatPrice(product.price)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                  <Eye className="h-3 w-3" />
                                  {(product as any).views || 0}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-slate-500">
                                {safeDate(product.createdAt) ? formatDistanceToNow(safeDate(product.createdAt)!, { addSuffix: true }) : 'N/A'}
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                <div className="flex items-center justify-end gap-3">
                                  {product.status === 'draft' ? (
                                    <Badge 
                                      className="bg-primary/10 text-primary border-primary/20 font-black text-[10px] uppercase px-3 py-1 cursor-pointer hover:bg-primary/20 transition-colors shadow-glow"
                                      onClick={() => router.push(`/sell/create?id=${product.id}`)}
                                    >
                                      Complete Draft
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black text-[10px] uppercase px-3 py-1">Active</Badge>
                                  )}
                                  <div className="h-8 w-px bg-white/5 mx-2" />
                                  <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5" onClick={() => setViewProduct(product)} title="View">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-white/5" onClick={() => setEditProduct(product)} title="Edit">
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-slate-400 hover:text-emerald-500 hover:bg-white/5"
                                      title="Mark as Sold"
                                      onClick={() => {
                                        setSelectedProductForSold(product);
                                        setIsSoldDialogOpen(true);
                                      }}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-white/5"
                                      title="Delete"
                                      onClick={() => handleDelete(product.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-24 bg-white/5 border-t border-white/5">
                        <Package className="h-16 w-16 mx-auto mb-6 opacity-10 text-primary" />
                        <p className="text-white font-black uppercase tracking-tight text-xl">Operational Silence</p>
                        <p className="text-slate-500 text-sm mt-1">No active listings currently registered in the grid.</p>
                        <Button variant="outline" className="mt-8 rounded-xl font-bold border-white/10 hover:bg-white/5 text-slate-400 hover:text-white" asChild>
                          <Link href="/sell/create">Initialize First Entry</Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sold">
                <Card className="bg-card/50 border-white/5 shadow-2xl overflow-hidden">
                  <CardHeader className="bg-white/5 border-b border-white/5">
                    <CardTitle className="text-xl font-black text-white uppercase tracking-tight">Deployment History</CardTitle>
                    <CardDescription className="text-slate-500 font-medium">Verified list of successful market distributions.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    {soldProducts.length > 0 ? (
                      <Table>
                        <TableHeader className="bg-white/5">
                          <TableRow className="hover:bg-transparent border-white/5">
                            <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-widest pl-6">Product</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Price</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Sold Date</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Protocol</TableHead>
                            <TableHead className="text-right text-slate-400 font-bold uppercase text-[10px] tracking-widest pr-6">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {soldProducts.map(product => (
                            <TableRow key={product.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                              <TableCell className="pl-6 py-4">
                                <div className="flex items-center gap-4">
                                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-900 border border-white/5">
                                    <Image src={product.imageUrls[0]} alt={product.title} fill sizes="56px" className="object-cover opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                                  </div>
                                  <span className="font-bold text-slate-300 group-hover:text-white line-clamp-1">{product.title}</span>
                                </div>
                              </TableCell>
                              <TableCell className="font-black text-white text-lg">${formatPrice(product.price)}</TableCell>
                              <TableCell className="text-slate-500 text-xs">{safeDate(product.soldAt || product.updatedAt) ? formatDistanceToNow(safeDate(product.soldAt || product.updatedAt)!, { addSuffix: true }) : 'N/A'}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-white/5 border-white/10 text-slate-400 text-[10px] font-black uppercase">{(product as any).fulfillmentStatus || 'Platform'}</Badge>
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5" onClick={() => setViewProduct(product)} title="View">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-400 hover:text-emerald-500 hover:bg-white/5"
                                    title="Republish"
                                    onClick={() => handleRepublish(product)}
                                    disabled={actionLoading}
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-24 bg-white/5">
                        <Package className="h-16 w-16 mx-auto mb-6 opacity-10 text-slate-500" />
                        <p className="text-slate-500 font-black uppercase tracking-tight">No Market Exits Logged</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          <div className="space-y-6">
            <Card className="bg-card/50 border-white/5 shadow-2xl overflow-hidden">
              <CardHeader className="bg-white/5 border-b border-white/5">
                <CardTitle className="text-xl font-black text-white uppercase tracking-tight">Recent Feedback</CardTitle>
                <CardDescription className="text-slate-500 font-medium">Your latest reputation updates from the network.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {reviews && reviews.length > 0 ? (
                  <div className="space-y-6">
                    {reviews.slice(0, 5).map(review => (
                      <div key={review.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'text-primary fill-primary' : 'text-slate-800'}`} />
                            ))}
                          </div>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Verified</span>
                        </div>
                        <p className="text-slate-300 text-sm italic leading-relaxed">"{review.comment}"</p>
                        <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                           <span className="text-xs font-bold text-white uppercase">{review.buyerName}</span>
                           <span className="text-[10px] text-slate-500 font-medium uppercase truncate max-w-[100px]">{review.productTitle}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <MessageSquare className="h-16 w-16 mx-auto mb-6 opacity-5 text-primary" />
                    <p className="text-slate-500 font-black uppercase tracking-tight">No Reputation Logs</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20 border-dashed shadow-2xl overflow-hidden">
              <CardHeader className="pb-3 px-6 pt-6">
                <CardTitle className="text-lg font-black text-primary uppercase tracking-tight flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  Grid Support
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-2">
                <div className="space-y-4">
                  <p className="text-sm text-slate-400 font-medium">Can't find a brand or category for your listing? Request a grid expansion.</p>
                  <BrandRequestModal />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog open={isSoldDialogOpen} onOpenChange={setIsSoldDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark as Sold</DialogTitle>
              <DialogDescription>
                How was this item sold? This will move the listing to your Sold tab.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fulfillment" className="text-right">
                  Fulfillment
                </Label>
                <Select value={fulfillmentType} onValueChange={setFulfillmentType}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select fulfillment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform">Platform (Standard)</SelectItem>
                    <SelectItem value="awaiting_collection">Awaiting Collection</SelectItem>
                    <SelectItem value="freight">Freight / Shipping Required</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSoldDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleMarkAsSold} disabled={actionLoading}>
                {actionLoading ? "Processing..." : "Confirm Sold"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!viewProduct} onOpenChange={(open) => !open && setViewProduct(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Product Preview</DialogTitle>
            </DialogHeader>
            {viewProduct && <ProductQuickView product={viewProduct} />}
          </DialogContent>
        </Dialog>

        <Dialog open={!!editProduct} onOpenChange={(open) => {
          if (!open) setEditProduct(null);
        }}>
          <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto w-full p-0">
            {/* Header is handled by ListingForm or we can add one here if needed. 
                 ListingForm has its own header. But DialogContent usually requires DialogTitle.
                 We can put visually hidden title if needed, or wrap. */}
            <div className="sr-only">
              <DialogTitle>Edit Listing</DialogTitle>
              <DialogDescription>Edit your listing details</DialogDescription>
            </div>
            {editProduct && (
              <ListingForm
                initialData={editProduct}
                onSuccess={() => {
                  setEditProduct(null);
                  toast({ title: "Updated", description: "Changes saved successfully." });
                }}
                onCancel={() => setEditProduct(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
