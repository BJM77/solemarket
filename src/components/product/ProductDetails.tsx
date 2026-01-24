
'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { notFound, useRouter } from 'next/navigation';
import Image from 'next/image';
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
    Info as InfoIcon,
    Copyright,
    ChevronRight
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, collection, query, where, getDocs, limit, addDoc, serverTimestamp, deleteDoc, setDoc, orderBy, updateDoc, increment } from 'firebase/firestore';
import { useCart } from '@/context/CartContext';
import type { Product, Review } from '@/lib/types';
import type { UserProfile } from '@/lib/types';
import { useViewedProducts } from '@/context/ViewedProductsContext';
import { useUser, useCollection, useMemoFirebase, useDoc, useFirebase } from '@/firebase';
import ReviewForm from '@/components/reviews/ReviewForm';
import ReviewList from '@/components/reviews/ReviewList';
import { placeBid, acceptBid } from '@/services/bidding';
import { Input } from '@/components/ui/input';
import { Bid } from '@/lib/types';
import ProductGrid from '@/components/products/ProductGrid';
import ProductGridSkeleton from '@/components/products/ProductGridSkeleton';

// Define types
interface Seller extends UserProfile {
    rating?: number;
    totalSales?: number;
    isVerified?: boolean;
    responseTime?: string;
    joinDate?: string;
    description?: string;
}


// Main product component
export default function ProductDetails({ productId, initialProduct }: { productId: string; initialProduct: Product }) {
    const router = useRouter();
    const { toast } = useToast();
    const { user, isUserLoading } = useUser();
    const { addItem, updateQuantity: updateCartQuantity } = useCart();
    const { markAsViewed } = useViewedProducts();
    
    const [selectedImage, setSelectedImage] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [seller, setSeller] = useState<Seller | null>(null);
    const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
    const [loadingRelated, setLoadingRelated] = useState(true);
    
    // Bidding State
    const [bidAmount, setBidAmount] = useState('');
    const [biddingLoading, setBiddingLoading] = useState(false);

    const { firestore } = useFirebase();
    
    const productRef = useMemoFirebase(() => firestore ? doc(db, 'products', productId) : null, [firestore, productId]);
    const { data: product, isLoading: isProductLoading, error: productError } = useDoc<Product>(productRef, {
        initialData: initialProduct,
    });

    const reviewsQuery = useMemoFirebase(() => {
        if (!firestore || !productId) return null;
        return query(
            collection(firestore, 'reviews'),
            where('productId', '==', productId),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, productId]);

    const { data: reviews, isLoading: reviewsLoading } = useCollection<Review>(reviewsQuery);

    const favoriteRef = useMemoFirebase(() => {
        if (!firestore || !user?.uid || !productId) return null;
        return doc(firestore, 'users', user.uid, 'favorites', productId);
    }, [firestore, user?.uid, productId]);

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
    
    // Increment view count
     useEffect(() => {
        if (productId && productRef) {
            const incrementView = async () => {
                await updateDoc(productRef, {
                    views: increment(1)
                });
            };
            incrementView().catch(console.error); // Fire-and-forget
        }
    }, [productId, productRef]);

    useEffect(() => {
        if (product) {
            markAsViewed(productId);
            // Fetch seller and related products
             const fetchExtraData = async () => {
                setLoadingRelated(true);
                if (product.sellerId) {
                    const sellerRef = doc(db, 'users', product.sellerId);
                    const sellerSnap = await getDoc(sellerRef);
                    if (sellerSnap.exists()) {
                        const sellerData = sellerSnap.data() as UserProfile;
                        setSeller({
                            ...sellerData,
                            id: sellerSnap.id,
                            rating: 4.8,
                            totalSales: 150,
                            isVerified: true,
                            joinDate: sellerData.createdAt?.toDate().toLocaleDateString() || new Date().toLocaleDateString(),
                        } as Seller);
                    }
                }

                const relatedQuery = query(
                    collection(db, 'products'),
                    where('category', '==', product.category),
                    where('__name__', '!=', productId),
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

            fetchExtraData();
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
    
    if (!product && !isProductLoading) {
        notFound();
    }
    
    if (!product) {
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

    const conditionColors: Record<string, string> = {
        'Mint': 'bg-green-100 text-green-800 border-green-200',
        'Near Mint': 'bg-emerald-100 text-emerald-800 border-emerald-200',
        'Excellent': 'bg-blue-100 text-blue-800 border-blue-200',
        'Good': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'Fair': 'bg-orange-100 text-orange-800 border-orange-200',
        'Poor': 'bg-red-100 text-red-800 border-red-200',
    };

    const handleAddToCart = () => {
        addItem(product);
        updateCartQuantity(product.id, quantity)
    };

    const handleBuyNow = () => {
        handleAddToCart();
        router.push('/checkout');
    };

    const handlePlaceBid = async () => {
        if (!user) {
            router.push(`/sign-in?redirect=/product/${product?.id}`);
            return;
        }
        if (!product || !bidAmount) return;

        try {
            setBiddingLoading(true);
            await placeBid(product.id, user.uid, user.displayName || 'Anonymous', parseFloat(bidAmount));
            toast({
                title: "Bid Placed",
                description: "Your bid has been submitted successfully!",
            });
            setBidAmount('');
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "Bid Failed",
                description: err.message,
            });
        } finally {
            setBiddingLoading(false);
        }
    };

    const handleAcceptBid = async (bidId: string) => {
        if (!product) return;
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

    const isCard = product.category === 'Collector Cards';
    const isCoin = product.category === 'Coins';

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
                        <div
                            className={cn(
                                'relative bg-gray-100 border overflow-hidden',
                                isCoin ? 'aspect-square rounded-full' : 'aspect-square rounded-2xl'
                            )}
                        >
                            <Image
                                src={product.imageUrls[selectedImage]}
                                alt={product.title}
                                fill
                                className={cn(
                                    'object-cover',
                                    isCoin ? 'rounded-full' : ''
                                )}
                                sizes="(max-width: 768px) 100vw, 50vw"
                                priority
                            />
                            <div className="absolute top-4 left-4 flex flex-col gap-2">
                                <Badge className={cn("border-none", conditionColors[product.condition as string] || 'bg-gray-100')}>
                                    {product.condition}
                                </Badge>
                                {(product as any).authentication?.isAuthenticated && (
                                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 border-none">
                                        <ShieldCheck className="h-3 w-3 mr-1" />
                                        Authenticated
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {product.imageUrls.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {product.imageUrls.map((url, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setSelectedImage(index)}
                                        className={cn(
                                            "relative w-20 h-20 overflow-hidden flex-shrink-0 border-2 transition-all",
                                            isCoin ? "rounded-full" : "rounded-lg",
                                            selectedImage === index
                                                ? "border-primary ring-2 ring-primary/20"
                                                : "border-transparent hover:border-gray-300"
                                        )}
                                        aria-label={`View image ${index + 1} of ${product.title}`}
                                    >
                                        <Image
                                            src={url}
                                            alt={`${product.title} view ${index + 1}`}
                                            fill
                                            className={cn(
                                                'object-cover',
                                                isCoin ? "rounded-full" : ""
                                            )}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
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
                                 <div className="flex items-center gap-1.5">
                                    <Eye className="w-4 h-4" />
                                    <span>{(product as any).views || 0} views</span>
                                </div>
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
                                        Add to Cart
                                    </Button>
                                    <Button
                                        size="lg"
                                        className="flex-1 bg-gradient-to-r from-primary to-primary/80"
                                        onClick={handleBuyNow}
                                        disabled={!product.quantity || product.quantity === 0}
                                    >
                                        <CreditCard className="h-5 w-5 mr-2" />
                                        Buy Now
                                    </Button>
                                </div>
                             )}
                        </div>

                        {product.isReverseBidding && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-lg">Bids</h3>
                                        <Badge variant="secondary">{product.bids?.length || 0} Bids</Badge>
                                    </div>
                                    {product.bids && product.bids.length > 0 ? (
                                        <div className="space-y-2 border p-3 rounded-lg max-h-60 overflow-y-auto bg-gray-50/50">
                                            {[...product.bids].sort((a, b) => b.amount - a.amount).map((bid) => (
                                                <div key={bid.id} className="flex justify-between items-center p-3 bg-white border rounded shadow-sm">
                                                    <div>
                                                        <div className="font-medium flex items-center gap-2">
                                                            {bid.bidderName}
                                                            {bid.bidderId === user?.uid && <Badge variant="outline" className="text-[10px] h-5">You</Badge>}
                                                        </div>
                                                        <div className="text-gray-500 text-xs mt-0.5">
                                                            {bid.timestamp?.seconds ? new Date(bid.timestamp.seconds * 1000).toLocaleDateString() : 'Just now'}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-lg">${bid.amount.toFixed(2)}</span>
                                                        {user?.uid === product.sellerId && bid.status === 'pending' && (
                                                            <Button size="sm" onClick={() => handleAcceptBid(bid.id)}>Accept</Button>
                                                        )}
                                                        {bid.status === 'accepted' && <Badge className="bg-green-500 hover:bg-green-600">Accepted</Badge>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center p-6 border-2 border-dashed rounded-lg text-gray-400 bg-gray-50">
                                            <p>No bids yet. Be the first to make an offer!</p>
                                        </div>
                                    )}

                                    {(!user || user.uid !== product.sellerId) ? (
                                        <div className="flex gap-3 pt-2">
                                            <div className="relative flex-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                                                <Input
                                                    type="number"
                                                    placeholder="Enter bid"
                                                    className="pl-8 h-12 text-lg"
                                                    value={bidAmount}
                                                    onChange={(e) => setBidAmount(e.target.value)}
                                                />
                                            </div>
                                            <Button
                                                onClick={handlePlaceBid}
                                                disabled={biddingLoading || !bidAmount}
                                                size="lg"
                                                className="px-8"
                                            >
                                                {biddingLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "Place Bid"}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100 flex items-center gap-2">
                                            <InfoIcon className="w-4 h-4" />
                                            <span>You are the seller. You can accept offers from the list above.</span>
                                        </div>
                                    )}
                                </div>
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
                                            <h3 className="font-semibold text-gray-900">{seller.displayName}</h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                <div className="flex items-center gap-1">
                                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                                    <span className="text-sm font-medium">{seller.rating}</span>
                                                    <span className="text-xs text-gray-500">({seller.totalSales} sales)</span>
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
                                            user={user as any}
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
                        {loadingRelated ? <ProductGridSkeleton count={4}/> : <ProductGrid products={relatedProducts} />}
                    </div>
                )}
            </div>
        </div>
    );
}
