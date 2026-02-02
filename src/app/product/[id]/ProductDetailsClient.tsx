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
import { cn, formatPrice } from '@/lib/utils';
import { db } from '@/lib/firebase/config';
import { doc, collection, query, where, getDocs, limit, addDoc, serverTimestamp, deleteDoc, setDoc, orderBy, updateDoc, increment, arrayUnion, Timestamp } from 'firebase/firestore';
import { useCart } from '@/context/CartContext';
import type { Product, Review } from '@/lib/types';
import type { UserProfile } from '@/lib/types';
import { useViewedProducts } from '@/context/ViewedProductsContext';
import { useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import ReviewForm from '@/components/reviews/ReviewForm';
import ReviewList from '@/components/reviews/ReviewList';
import { acceptBidAction } from '@/app/actions/bidding';
import { deleteProductByAdmin } from '@/app/actions/admin';
import { createProductAction, recordProductView } from '@/app/actions/products';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { Trash2, DollarSign, Phone } from 'lucide-react';
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
import { incrementProductContactCount } from '@/app/actions/product-updates';
import { OfferModal } from '@/components/products/OfferModal';

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
    const [isPhoneRevealed, setIsPhoneRevealed] = useState(false); // State for phone reveal
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
            const idToken = await getCurrentUserIdToken();
            if (!idToken) throw new Error("Authentication session expired.");

            const result = await acceptBidAction(product.id, idToken, bidId);

            if (!result.success) {
                throw new Error(result.error);
            }

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

    const handleRevealPhone = async () => {
        if (!user) {
            router.push(`/sign-in?redirect=/product/${product?.id}`);
            return;
        }

        setIsPhoneRevealed(true);
        // Fire and forget - count the reveal
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
                <div className="flex items-center justify-between mb-6">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="hover:bg-transparent hover:text-primary p-0 h-auto font-medium"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Back to Results
                    </Button>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!adjacentProducts.prevId}
                            onClick={() => adjacentProducts.prevId && router.push(`/product/${adjacentProducts.prevId}`)}
                            title="Previous Item (Newer)"
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Prev
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!adjacentProducts.nextId}
                            onClick={() => adjacentProducts.nextId && router.push(`/product/${adjacentProducts.nextId}`)}
                            title="Next Item (Older)"
                        >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
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
                                    ${formatPrice(product.price)}
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
                                <div className="flex flex-row gap-3">
                                    <Button
                                        size="lg"
                                        className="flex-1 h-20 text-lg font-bold"
                                        onClick={handleAddToCart}
                                        disabled={!product.quantity || product.quantity === 0}
                                    >
                                        <ShoppingCart className="h-6 w-6 mr-2" />
                                        Buy It
                                    </Button>
                                    {product.isNegotiable && (
                                        <OfferModal
                                            product={product}
                                            user={user}
                                            trigger={
                                                <Button
                                                    size="lg"
                                                    variant="outline"
                                                    className="flex-1 h-20 text-lg font-bold"
                                                >
                                                    <DollarSign className="h-6 w-6 mr-2" />
                                                    Make Offer
                                                </Button>
                                            }
                                        />
                                    )}
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
                                                    <span className="text-sm font-medium">{typeof seller.rating === 'number' ? seller.rating.toFixed(1) : 'N/A'}</span>
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

                                    <div className="grid grid-cols-2 gap-2">
                                        <Button variant="outline" size="sm" onClick={handleStartConversation}>
                                            <MessageSquare className="h-4 w-4 mr-2" />
                                            Message
                                        </Button>
                                        {seller.phoneNumber && (
                                            <Button
                                                variant={isPhoneRevealed ? "secondary" : "default"}
                                                size="sm"
                                                onClick={handleRevealPhone}
                                                className={cn(isPhoneRevealed ? "bg-green-100 text-green-800 hover:bg-green-200" : "")}
                                            >
                                                <Phone className="h-4 w-4 mr-2" />
                                                {isPhoneRevealed ? seller.phoneNumber : "Show Phone"}
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
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
                                            <h3 className="font-semibold text-lg border-b pb-2">Product Description</h3>
                                            <div className="prose max-w-none text-gray-600">
                                                <p className="whitespace-pre-line">{product.description}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h3 className="font-semibold text-lg border-b pb-2">Specifications</h3>
                                            <dl className="grid grid-cols-2 gap-y-4 text-sm">
                                                <dt className="text-muted-foreground font-medium">Category</dt>
                                                <dd className="font-semibold text-gray-900">{product.category}</dd>

                                                {product.subCategory && (
                                                    <>
                                                        <dt className="text-muted-foreground font-medium">Sub-category</dt>
                                                        <dd className="font-semibold text-gray-900">{product.subCategory}</dd>
                                                    </>
                                                )}

                                                <dt className="text-muted-foreground font-medium">Condition</dt>
                                                <dd className="font-semibold text-gray-900">
                                                    <Badge variant="secondary" className="font-semibold">
                                                        {product.condition}
                                                    </Badge>
                                                </dd>

                                                {product.year && (
                                                    <>
                                                        <dt className="text-muted-foreground font-medium">Year</dt>
                                                        <dd className="font-semibold text-gray-900">{product.year}</dd>
                                                    </>
                                                )}

                                                {product.manufacturer && (
                                                    <>
                                                        <dt className="text-muted-foreground font-medium">Manufacturer</dt>
                                                        <dd className="font-semibold text-gray-900">{product.manufacturer}</dd>
                                                    </>
                                                )}

                                                {product.cardNumber && (
                                                    <>
                                                        <dt className="text-muted-foreground font-medium">Card Number</dt>
                                                        <dd className="font-semibold text-gray-900">#{product.cardNumber}</dd>
                                                    </>
                                                )}

                                                {product.gradingCompany && product.gradingCompany !== 'Raw' && (
                                                    <>
                                                        <dt className="text-muted-foreground font-medium">Grading Co.</dt>
                                                        <dd className="font-semibold text-gray-900">{product.gradingCompany}</dd>

                                                        <dt className="text-muted-foreground font-medium">Grade</dt>
                                                        <dd className="font-semibold text-gray-900">{product.grade}</dd>

                                                        {product.certNumber && (
                                                            <>
                                                                <dt className="text-muted-foreground font-medium">Certification</dt>
                                                                <dd className="font-semibold text-gray-900">{product.certNumber}</dd>
                                                            </>
                                                        )}
                                                    </>
                                                )}

                                                <dt className="text-muted-foreground font-medium">Product ID</dt>
                                                <dd className="font-mono text-xs text-gray-500 uppercase">{product.id}</dd>
                                            </dl>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="reviews">
                            <Suspense fallback={<Loader2 className="animate-spin" />}>
                                {isUserLoading ? (
                                    <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                                ) : (
                                    <div className="space-y-8">
                                        <ReviewForm
                                            user={user}
                                            productId={product.id}
                                            productTitle={product.title}
                                            sellerId={product.sellerId}
                                        />
                                        <ReviewList reviews={reviews || []} isLoading={reviewsLoading} />
                                    </div>
                                )}
                            </Suspense>
                        </TabsContent>
                    </Tabs>
                </div>

                {
                    relatedProducts.length > 0 && (
                        <div className="lg:col-span-2 mt-16">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Collectibles</h2>
                            {loadingRelated ? <ProductGridSkeleton count={4} /> : <ProductGrid products={relatedProducts} />}
                        </div>
                    )
                }
            </div >
        </div >
    );
}
