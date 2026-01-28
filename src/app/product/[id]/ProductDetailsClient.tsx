
'use client';

import { useState, useEffect, useCallback, useMemo, Suspense, useRef } from 'react';
import { notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
    Share2,
    Heart,
    Star,
    ShieldCheck,
    CheckCircle,
    AlertCircle,
    ChevronLeft,
    MessageSquare,
    Eye,
    Calendar,
    ShoppingCart,
    CreditCard,
    Loader2,
    Copyright,
    ChevronRight,
    Hash
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase/config';
import { doc, collection, query, where, getDocs, limit, addDoc, serverTimestamp, deleteDoc, setDoc, orderBy, updateDoc, increment, arrayUnion, Timestamp } from 'firebase/firestore';
import { useCart } from '@/context/CartContext';
import type { Product, Review } from '@/lib/types';
import type { UserProfile } from '@/lib/types';
import { useViewedProducts } from '@/context/ViewedProductsContext';
import { useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import ReviewForm from '@/components/reviews/ReviewForm';
import ReviewList from '@/components/reviews/ReviewList';
import { placeBid, acceptBid } from '@/services/bidding';
import { deleteProductByAdmin } from '@/app/actions/admin';
import { createProductAction, recordProductView } from '@/app/actions/products';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { Trash2, DollarSign } from 'lucide-react';
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
import { BiddingInterface } from '@/components/products/BiddingInterface';
import ProductImageGallery from '@/components/products/ProductImageGallery';
import { SUPER_ADMIN_EMAILS, SUPER_ADMIN_UIDS } from '@/lib/constants';

export default function ProductDetailsClient({
    productId,
    initialProduct,
    initialSeller,
    initialReviews
}: {
    productId: string;
    initialProduct: Product;
    initialSeller: UserProfile | null;
    initialReviews: Review[];
}) {
    const router = useRouter();
    const { toast } = useToast();
    const { user, isUserLoading } = useUser();
    const { addItem } = useCart();
    const { markAsViewed } = useViewedProducts();

    const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
    const [loadingRelated, setLoadingRelated] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const viewRecordedRef = useRef<string | null>(null);

    // Super admin check
    const isSuperAdmin = (user?.uid && SUPER_ADMIN_UIDS.includes(user.uid)) || (user?.email && SUPER_ADMIN_EMAILS.includes(user.email));

    const productRef = useMemoFirebase(() => doc(db, 'products', productId), [productId]);
    const { data: product, isLoading: isProductLoading, error: productError } = useDoc<Product>(productRef, {
        initialData: initialProduct,
    });

    const sellerRef = useMemoFirebase(() => product?.sellerId ? doc(db, 'users', product.sellerId) : null, [product?.sellerId]);
    const { data: seller, isLoading: isSellerLoading } = useDoc<UserProfile>(sellerRef, { initialData: initialSeller });

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
            if (!user) {
                router.push(`/sign-in?redirect=/product/${product?.id}`);
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
        if (!productId || viewRecordedRef.current === productId) return;

        // We mark it as recorded immediately to prevent double-firing due to StrictMode or fast renders
        viewRecordedRef.current = productId;

        const recordView = async () => {
            try {
                await recordProductView(productId, user?.uid);
            } catch (error) {
                console.error("Failed to record product view:", error);
            }
        };

        recordView();
    }, [productId, user?.uid]);

    useEffect(() => {
        if (product) {
            markAsViewed(productId);
            // Fetch related products
            const fetchRelatedProducts = async () => {
                setLoadingRelated(true);

                const relatedQuery = query(
                    collection(db, 'products'),
                    where('category', '==', product.category),
                    where('__name__', '!=', productId),
                    where('isDraft', '==', false),
                    limit(4)
                );
                const relatedSnap = await getDocs(relatedQuery);
                const relatedData = relatedSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Product[];
                setRelatedProducts(relatedData);
                setLoadingRelated(false);
            };

            fetchRelatedProducts();
        }
    }, [product, productId, markAsViewed]);

    useEffect(() => {
        if (productError) {
            toast({
                title: "Error loading product",
                description: productError.message,
                variant: 'destructive',
            })
        }
    }, [productError, toast]);

    const isLoading = isProductLoading || isSellerLoading;

    if (isLoading && !product) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Skeleton className="h-10 w-24 mb-6" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                    <div>
                        <Skeleton className="aspect-square rounded-2xl mb-4" />
                        <div className="flex gap-2">
                            {[...Array(4)].map((_, i) => (
                                <Skeleton key={i} className="w-20 h-20 rounded-lg" />
                            ))}
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <Skeleton className="h-4 w-1/4" />
                            <Skeleton className="h-9 w-3/4" />
                            <Skeleton className="h-10 w-1/3" />
                            <div className="flex gap-4">
                                <Skeleton className="h-5 w-1/4" />
                                <Skeleton className="h-5 w-1/4" />
                            </div>
                            <Skeleton className="h-20 w-full" />
                        </div>
                        <Skeleton className="h-12 w-full" />
                        <div className="flex gap-3">
                            <Skeleton className="h-12 flex-1" />
                            <Skeleton className="h-12 flex-1" />
                        </div>
                        <Skeleton className="h-20 w-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (!product) {
        notFound();
    }

    const handleAddToCart = () => {
        addItem(product, 1);
        toast({
            title: "Added to Cart!",
            description: `${product.title} is now in your cart.`,
        });
    };



    const handleAcceptBid = async (bidId: string) => {
        try {
            await acceptBid(product.id, bidId);
            toast({
                title: "Bid Accepted",
                description: "You have accepted the offer!",
            });
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: err.message,
            });
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

            if (!result.success) {
                throw new Error(result.error);
            }

            toast({
                title: "Product Deleted",
                description: result.message,
            });
            router.push('/browse');

        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Deletion Failed",
                description: error.message || "An error occurred.",
            });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="mb-6"
                >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                    <div className="space-y-4">
                        <ProductImageGallery
                            images={product.imageUrls}
                            title={product.title}
                            isCard={product.category === 'Collector Cards'}
                            condition={product.condition}
                        />
                    </div>

                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline" className="text-xs">
                                    {product.category} {product.subCategory && `> ${product.subCategory}`}
                                </Badge>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={toggleFavorite}
                                        className="h-9 w-9"
                                    >
                                        <Heart className={cn("h-5 w-5", isFavorited && "fill-red-500 text-red-500")} />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-9 w-9">
                                        <Share2 className="h-5 w-5" />
                                    </Button>
                                    {isSuperAdmin && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50">
                                                    {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete the product "{product.title}".
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
                            </div>

                            <h1 className="text-3xl font-bold text-gray-900 mb-3">{product.title}</h1>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="text-4xl font-bold text-gray-900">
                                    ${product.price.toFixed(2)}
                                </div>
                            </div>

                            <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                                {product.year && (
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4" />
                                        <span>Year: {product.year}</span>
                                    </div>
                                )}
                                {product.manufacturer && (
                                    <div className="flex items-center gap-1.5">
                                        <Copyright className="w-4 h-4" />
                                        <span>{product.manufacturer}</span>
                                    </div>
                                )}
                                {product.cardNumber && (
                                    <div className="flex items-center gap-1.5">
                                        <Hash className="w-4 h-4" />
                                        <span>#{product.cardNumber}</span>
                                    </div>
                                )}
                            </div>

                            <p className="text-gray-600 mt-4">{product.description}</p>
                        </div>

                        {(product.quantity && product.quantity > 0) ? (
                            <Alert className="bg-green-50 border-green-200">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-800">
                                    <span className="font-semibold">In Stock</span>
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    <span className="font-semibold">Out of Stock</span>
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-4 pt-4 border-t">
                            {(!product.isReverseBidding || user?.uid === product.sellerId) && (
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Button
                                        size="lg"
                                        className="flex-1"
                                        onClick={handleAddToCart}
                                        disabled={!product.quantity || product.quantity === 0}
                                    >
                                        <ShoppingCart className="h-5 w-5 mr-2" />
                                        Buy It
                                    </Button>
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => toast({ title: "Make Offer", description: "This feature is coming soon!" })}
                                    >
                                        <DollarSign className="h-5 w-5 mr-2" />
                                        Make Offer
                                    </Button>

                                </div>
                            )}
                        </div>

                        {product.isReverseBidding && user && (
                            <BiddingInterface
                                product={product}
                                user={user}
                                onAcceptBid={handleAcceptBid}
                            />
                        )}

                        {seller && (
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Avatar className="h-12 w-12 border">
                                            <AvatarImage src={seller.photoURL || ''} />
                                            <AvatarFallback>{seller.displayName?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900 flex items-center gap-1">
                                                {seller.displayName}
                                                {seller.isVerified && <ShieldCheck className="h-4 w-4 text-blue-500" />}
                                            </h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                <div className="flex items-center gap-1">
                                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                    <span className="text-sm font-medium">{seller.rating?.toFixed(1) || 'N/A'}</span>
                                                    <span className="text-xs text-gray-500">({seller.totalSales || 0} sales)</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/seller/${product.sellerId}`}>
                                                View Shop <ChevronRight className="w-4 h-4 ml-1" />
                                            </Link>
                                        </Button>
                                    </div>
                                    <Button variant="outline" size="sm" className="w-full" onClick={handleStartConversation}>
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        Message Seller
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-2 mt-12">
                    <Tabs defaultValue="reviews" className="space-y-6">
                        <TabsList className="grid grid-cols-2 w-full max-w-sm">
                            <TabsTrigger value="reviews">Reviews ({reviews?.length || 0})</TabsTrigger>
                            <TabsTrigger value="details">Item Details</TabsTrigger>
                        </TabsList>
                        <TabsContent value="reviews">
                            <Suspense fallback={<Loader2 className="animate-spin" />}>
                                {isUserLoading ? (
                                    <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                                ) : (
                                    <>
                                        <ReviewForm
                                            user={user}
                                            productId={product.id}
                                            productTitle={product.title}
                                            sellerId={product.sellerId}
                                        />
                                        <ReviewList reviews={reviews || []} isLoading={reviewsLoading} />
                                    </>
                                )}
                            </Suspense>
                        </TabsContent>

                        <TabsContent value="details">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="prose max-w-none text-gray-600">
                                        <p>{product.description}</p>
                                        {/* Additional details would be rendered here */}
                                    </div>
                                </CardContent>
                            </Card>
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
        </div>
    );
}
