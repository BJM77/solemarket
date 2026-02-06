
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
import { RotateCcw } from 'lucide-react';

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
    return query(collection(firestore, 'products'), where('sellerId', '==', user.uid), orderBy('createdAt', 'desc'));
  }, [firestore, user?.uid]);

  const { data: products, isLoading: productsLoading } = useCollection<Product>(userProductsQuery);

  const sellerReviewsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'reviews'), where('sellerId', '==', user.uid), orderBy('createdAt', 'desc'));
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
    if (!selectedProductForSold) return;
    setActionLoading(true);
    const result = await markAsSold(selectedProductForSold.id, fulfillmentType);
    if (result.success) {
      toast({ title: "Success", description: "Listing marked as sold." });
      setIsSoldDialogOpen(false);
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setActionLoading(false);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;
    const result = await deleteListing(productId);
    if (result.success) {
      toast({ title: "Success", description: "Listing deleted." });
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const activeProducts = useMemo(() => products?.filter(p => !p.status || p.status === 'available' || p.status === 'draft' || p.status === 'pending_approval' || p.status === 'on_hold') || [], [products]);
  const soldProducts = useMemo(() => products?.filter(p => p.status === 'sold') || [], [products]);

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
    const totalRevenue = activeProducts.reduce((acc, p) => acc + Number(p.price || 0), 0);
    const activeListings = activeProducts.length;
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews : 0;
    const totalViews = products.reduce((acc, p) => acc + ((p as any).views || 0), 0);


    // Real conversion rate: Sold / Total Views
    const conversionRate = totalViews > 0 ? (soldProducts.length / totalViews) * 100 : 0;

    return { totalRevenue, activeListings, averageRating, totalReviews, totalViews, conversionRate };
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
    { label: 'Potential Revenue', value: `$${formatPrice(stats.totalRevenue)}`, change: '+12.5%', icon: DollarSign, color: 'text-green-600 bg-green-100' },
    { label: 'Active Listings', value: stats.activeListings, change: '', icon: Package, color: 'text-blue-600 bg-blue-100' },
    { label: 'Conversion Rate', value: `${typeof stats.conversionRate === 'number' ? stats.conversionRate.toFixed(1) : '0.0'}%`, change: '+1.4%', icon: TrendingUp, color: 'text-purple-600 bg-purple-100' },
    { label: 'Seller Rating', value: `${typeof stats.averageRating === 'number' ? stats.averageRating.toFixed(1) : '0.0'}/5`, change: `(${stats.totalReviews} reviews)`, icon: Star, color: 'text-yellow-600 bg-yellow-100' },
  ];




  const handleRepublish = async (product: Product) => {
    try {
      setActionLoading(true);
      const result = await republishListing(product.id);

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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user.displayName}! Here's your business overview.</p>
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
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="active">Active ({activeProducts.length})</TabsTrigger>
                <TabsTrigger value="sold">Sold ({soldProducts.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="active">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="space-y-1">
                      <CardTitle>Active Listings</CardTitle>
                      <CardDescription>Manage your currently live product listings.</CardDescription>
                    </div>
                    <Button asChild size="sm">
                      <Link href="/sell/create">
                        <Upload className="h-4 w-4 mr-2" />
                        New Listing
                      </Link>
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {activeProducts.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Views</TableHead>
                            <TableHead>Listed</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeProducts.map(product => (
                            <TableRow key={product.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="relative w-12 h-12 rounded-md overflow-hidden bg-muted">
                                    <Image src={product.imageUrls[0]} alt={product.title} fill sizes="48px" className="object-cover" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-medium line-clamp-1">{product.title}</span>
                                    {product.status === 'draft' && <Badge variant="secondary" className="w-fit text-[10px] h-4">Draft</Badge>}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>${formatPrice(product.price)}</TableCell>
                              <TableCell>{(product as any).views || 0}</TableCell>
                              <TableCell>{safeDate(product.createdAt) ? formatDistanceToNow(safeDate(product.createdAt)!, { addSuffix: true }) : 'N/A'}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500" onClick={() => setViewProduct(product)} title="View">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-500" onClick={() => setEditProduct(product)} title="Edit">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-green-600"
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
                                    className="h-8 w-8 text-red-500"
                                    title="Delete"
                                    onClick={() => handleDelete(product.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No active listings.</p>
                        <Button variant="outline" className="mt-4" asChild>
                          <Link href="/sell/create">Create New Listing</Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sold">
                <Card>
                  <CardHeader>
                    <CardTitle>Sold Items</CardTitle>
                    <CardDescription>History of your completed sales.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {soldProducts.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Sold Date</TableHead>
                            <TableHead>Fulfillment</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {soldProducts.map(product => (
                            <TableRow key={product.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="relative w-12 h-12 rounded-md overflow-hidden bg-muted">
                                    <Image src={product.imageUrls[0]} alt={product.title} fill sizes="48px" className="object-cover" />
                                  </div>
                                  <span className="font-medium line-clamp-2">{product.title}</span>
                                </div>
                              </TableCell>
                              <TableCell>${formatPrice(product.price)}</TableCell>
                              <TableCell>{safeDate(product.soldAt || product.updatedAt) ? formatDistanceToNow(safeDate(product.soldAt || product.updatedAt)!, { addSuffix: true }) : 'N/A'}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">{(product as any).fulfillmentStatus || 'Platform'}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500" onClick={() => setViewProduct(product)} title="View">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-green-600"
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
                      <div className="text-center py-12 text-gray-500">
                        <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No sold items yet.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
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
