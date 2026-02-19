'use client';

import { useState, useEffect, useCallback, useMemo, Suspense, useRef } from 'react';
import { notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
    Heart,
    ChevronLeft,
    Loader2,
    ChevronRight,
    Search,
    ExternalLink,
    Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase/config';
import { doc, collection, query, where, getDocs, serverTimestamp, deleteDoc, setDoc, orderBy, Timestamp, addDoc } from 'firebase/firestore';
import { useCart } from '@/context/CartContext';
import type { Product, Review } from '@/lib/types';
import type { UserProfile } from '@/lib/types';
import { useViewedProducts } from '@/context/ViewedProductsContext';
import { useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import ReviewForm from '@/components/reviews/ReviewForm';
import ReviewList from '@/components/reviews/ReviewList';
import { acceptBidAction } from '@/app/actions/bidding';
import { deleteProductByAdmin } from '@/app/actions/admin';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ProductGrid from '@/components/products/ProductGrid';
import ProductGridSkeleton from '@/components/products/ProductGridSkeleton';
import ProductImageGallery from '@/components/products/ProductImageGallery';
import { SUPER_ADMIN_EMAILS, SUPER_ADMIN_UIDS } from '@/lib/constants';
import { incrementProductContactCount } from '@/app/actions/product-updates';
import { GuestMessageDialog } from '@/components/product/GuestMessageDialog';
import { EbaySearchModal } from '@/components/admin/EbaySearchModal';
import { StickyProductFooter } from '@/components/products/StickyProductFooter';

// Refactored sub-components
import { ProductHeader } from '@/components/product/ProductHeader';
import { ProductActions } from '@/components/product/ProductActions';
import { SellerCard } from '@/components/product/SellerCard';
import { ProductStoryShare } from '@/components/product/ProductStoryShare';

export default function ProductDetailsClient({
    productId,
    initialProduct,
    initialSeller,
    initialReviews,
    adjacentProducts = { prevId: null, nextId: null }
}: {
    productId: string;
    initialProduct: Product;
    initialSeller: UserProfile | null;
    initialReviews: Review[];
    adjacentProducts?: { prevId: string | null; nextId: string | null };
}) {
    const router = useRouter();
    const { toast } = useToast();
    const { user, isUserLoading } = useUser();
    const { addItem } = useCart();
    const { markAsViewed } = useViewedProducts();

    const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
    const [loadingRelated, setLoadingRelated] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isPhoneRevealed, setIsPhoneRevealed] = useState(false);
    const [isGuestMessageOpen, setIsGuestMessageOpen] = useState(false);

    // Super admin check
    const isSuperAdmin = (user?.uid && SUPER_ADMIN_UIDS.includes(user.uid)) || (user?.email && SUPER_ADMIN_EMAILS.includes(user.email));

    const productRef = useMemoFirebase(() => doc(db, 'products', productId), [productId]);
    const { data: product, isLoading: isProductLoading } = useDoc<Product>(productRef, {
        initialData: initialProduct,
    });

    const sellerRef = useMemoFirebase(() => product?.sellerId ? doc(db, 'users', product.sellerId) : null, [product?.sellerId]);
    const { data: seller, isLoading: isSellerLoading } = useDoc<UserProfile>(sellerRef, { initialData: initialSeller ?? undefined });

    const reviewsQuery = useMemoFirebase(() =>
        query(
            collection(db, 'reviews'),
            where('productId', '==', productId),
            orderBy('createdAt', 'desc')
        ),
        [productId]);
    const { data: reviews, isLoading: reviewsLoading } = useCollection<Review>(reviewsQuery, { initialData: initialReviews });

    const favoriteRef = useMemoFirebase(() =>
        user?.uid ? doc(db, `users/${user.uid}/favorites/${productId}`) : null
        , [user?.uid, productId]);
    const { data: favorite } = useDoc(favoriteRef);
    const isFavorited = favorite !== null;

    const toggleFavorite = useCallback(async () => {
        if (!user || !favoriteRef) {
            router.push(`/sign-in?redirect=/product/${productId}`);
            return;
        }
        if (isFavorited) {
            await deleteDoc(favoriteRef);
            toast({ title: "Removed from favorites." });
        } else {
            await setDoc(favoriteRef, {
                productId: productId,
                addedAt: serverTimestamp(),
            });
            toast({ title: "Added to favorites!" });
        }
    }, [user, favoriteRef, isFavorited, productId, router, toast]);

    const handleStartConversation = async () => {
        if (!user || !product || !seller) {
            if (!user && product && seller) {
                setIsGuestMessageOpen(true);
            }
            return;
        }

        if (user.uid === seller.id) {
            toast({ title: "You can't message yourself.", variant: 'destructive' });
            return;
        }

        const conversationQuery = query(
            collection(db, 'conversations'),
            where('participantIds', 'array-contains', user.uid)
        );

        const querySnapshot = await getDocs(conversationQuery);
        let existingConversation: any = null;

        querySnapshot.forEach(doc => {
            const data = doc.data();
            if (data.participantIds.includes(seller.id) && data.productContext?.id === product.id) {
                existingConversation = { id: doc.id, ...data };
            }
        });

        if (existingConversation) {
            router.push(`/messages/${existingConversation.id}`);
        } else {
            const newConversationRef = await addDoc(collection(db, 'conversations'), {
                participantIds: [user.uid, seller.id],
                participants: {
                    [user.uid]: {
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                    },
                    [seller.id]: {
                        displayName: seller.displayName,
                        photoURL: seller.photoURL,
                    }
                },
                lastMessage: {
                    text: `Inquiry about: ${product.title}`,
                    senderId: user.uid,
                    timestamp: serverTimestamp(),
                },
                productContext: {
                    id: product.id,
                    title: product.title,
                    imageUrl: product.imageUrls[0],
                },
                createdAt: serverTimestamp(),
            });
            router.push(`/messages/${newConversationRef.id}`);
        }
    };

    useEffect(() => {
        if (product && productId) {
            markAsViewed(productId);
            const fetchRelatedProducts = async () => {
                const q = query(
                    collection(db, 'products'),
                    where('category', '==', product.category),
                    where('status', '==', 'available'),
                    limit(5)
                );
                const querySnapshot = await getDocs(q);
                const relatedData = querySnapshot.docs.filter(doc => doc.id !== productId).map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Product[];
                setRelatedProducts(relatedData);
                setLoadingRelated(false);
            };
            fetchRelatedProducts();
        }
    }, [product, productId, markAsViewed]);

    const isLoading = isProductLoading || isSellerLoading;

    if (isLoading && !product) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Skeleton className="h-10 w-24 mb-6" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
                    <div className="lg:max-w-sm mx-auto w-full">
                        <Skeleton className="aspect-[5/7] rounded-2xl mb-4" />
                        <div className="grid grid-cols-4 gap-2">
                            {[...Array(4)].map((_, i) => (
                                <Skeleton key={i} className="aspect-[5/7] rounded-lg" />
                            ))}
                        </div>
                    </div>
                    <div className="space-y-6">
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (!product) notFound();

    const handleAddToCart = () => {
        if (!user) {
            router.push(`/sign-in?redirect=/product/${product?.id}`);
            return;
        }
        if ((user as any).role !== 'admin' && (user as any).role !== 'superadmin' && !(user as any).isVerified) {
            toast({
                title: "Verification Required",
                description: "You must verify your identity before adding items to cart.",
                variant: "destructive"
            });
            router.push('/verify');
            return;
        }
        addItem(product, 1);
        toast({ title: "Added to Cart!", description: `${product.title} is now in your cart.` });
    };

    const handleAcceptBid = async (bidId: string) => {
        try {
            const idToken = await getCurrentUserIdToken();
            if (!idToken) throw new Error("Authentication session expired.");
            const result = await acceptBidAction(product.id, idToken, bidId);
            if (!result.success) throw new Error(result.error);
            toast({ title: "Bid Accepted", description: "You have accepted the offer!" });
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    };

    const handleRevealPhone = async () => {
        if (!user) {
            router.push(`/sign-in?redirect=/product/${product?.id}`);
            return;
        }
        setIsPhoneRevealed(true);
        try {
            await incrementProductContactCount(productId);
        } catch (e) {
            console.error("Failed to increment contact count", e);
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (!isSuperAdmin) return;
        setIsDeleting(true);
        try {
            const idToken = await getCurrentUserIdToken();
            if (!idToken) throw new Error("Authentication session expired.");
            const result = await deleteProductByAdmin(productId, idToken);
            if (!result.success) throw new Error(result.error);
            toast({ title: "Product Deleted", description: result.message });
            router.push('/browse');
        } catch (error: any) {
            toast({ variant: "destructive", title: "Deletion Failed", description: error.message || "An error occurred." });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-6">
                    <Button variant="ghost" onClick={() => router.back()} className="hover:bg-transparent hover:text-primary p-0 h-auto font-medium">
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Back to Results
                    </Button>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={!adjacentProducts.prevId} onClick={() => adjacentProducts.prevId && router.push(`/product/${adjacentProducts.prevId}`)}>
                            <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                        </Button>
                        <Button variant="outline" size="sm" disabled={!adjacentProducts.nextId} onClick={() => adjacentProducts.nextId && router.push(`/product/${adjacentProducts.nextId}`)}>
                            Next <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
                    <div className="lg:max-w-sm mx-auto w-full space-y-4">
                        <ProductImageGallery
                            images={product.imageUrls}
                            title={product.title}
                            isCard={product.category === 'Collector Cards'}
                            category={product.category}
                            condition={product.condition}
                        />
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-2">
                             <div />
                             <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={toggleFavorite} className="h-9 w-9">
                                    <Heart className={cn("h-5 w-5", isFavorited && "fill-red-500 text-red-500")} />
                                </Button>
                                <ProductStoryShare product={product} />
                                {isSuperAdmin && (
                                    <div className="flex items-center gap-2 ml-2 pl-2 border-l">
                                        <EbaySearchModal
                                            defaultQuery={product.title}
                                            trigger={
                                                <Button variant="ghost" size="icon" className="h-9 w-9 text-blue-600" title="Check eBay Prices">
                                                    <Search className="h-5 w-5" />
                                                </Button>
                                            }
                                        />
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500">
                                                    {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>This action cannot be undone. Permanently delete "{product.title}".</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                )}
                             </div>
                        </div>

                        <ProductHeader product={product} />
                        
                        <ProductActions 
                            product={product} 
                            user={user} 
                            onAddToCart={handleAddToCart} 
                            onAcceptBid={handleAcceptBid} 
                        />

                        {seller && (
                            <SellerCard 
                                seller={seller} 
                                isPhoneRevealed={isPhoneRevealed} 
                                onStartConversation={handleStartConversation} 
                                onRevealPhone={handleRevealPhone} 
                                sellerShopId={product.sellerId}
                            />
                        )}
                    </div>
                </div>

                <div className="lg:col-span-2 mt-12">
                    <Tabs defaultValue="details" className="space-y-6">
                        <TabsList className="grid grid-cols-2 w-full max-w-sm">
                            <TabsTrigger value="details">Item Details</TabsTrigger>
                            <TabsTrigger value="reviews">Reviews ({reviews?.length || 0})</TabsTrigger>
                        </TabsList>
                        <TabsContent value="details">
                            <Card className="border-none shadow-none bg-transparent">
                                <CardContent className="px-0 pt-0">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                        <div className="space-y-4">
                                            <h3 className="font-semibold text-lg border-b pb-2">Description</h3>
                                            <p className="whitespace-pre-line text-gray-600">{product.description}</p>
                                        </div>
                                        <div className="space-y-4">
                                            <h3 className="font-semibold text-lg border-b pb-2">Specifications</h3>
                                            <dl className="grid grid-cols-2 gap-y-4 text-sm">
                                                <dt className="text-muted-foreground">Category</dt>
                                                <dd className="font-semibold">{product.category}</dd>
                                                <dt className="text-muted-foreground">Condition</dt>
                                                <dd><Badge variant="secondary">{product.condition}</Badge></dd>
                                                {product.brand && <><dt className="text-muted-foreground">Brand</dt><dd className="font-semibold">{product.brand}</dd></>}
                                                <dt className="text-muted-foreground">Product ID</dt>
                                                <dd className="font-mono text-xs text-gray-400 uppercase">{product.id}</dd>
                                            </dl>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="reviews">
                            <div className="space-y-8">
                                <ReviewForm user={user} productId={product.id} productTitle={product.title} sellerId={product.sellerId} />
                                <ReviewList reviews={reviews || []} isLoading={reviewsLoading} />
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {relatedProducts.length > 0 && (
                    <div className="lg:col-span-2 mt-16">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Collectibles</h2>
                        {loadingRelated ? <ProductGridSkeleton count={4} /> : <ProductGrid products={relatedProducts} />}
                    </div>
                )}
            </div>

            {product && <StickyProductFooter product={product} user={isUserLoading ? null : user as any} />}
            {product && seller && (
                <GuestMessageDialog
                    isOpen={isGuestMessageOpen}
                    onClose={() => setIsGuestMessageOpen(false)}
                    sellerId={seller.id}
                    productId={product.id}
                    productTitle={product.title}
                />
            )}
        </div>
    );
}
