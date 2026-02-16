'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Share2,
    Heart,
    Star,
    ShieldCheck,
    CheckCircle,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    MessageSquare,
    Phone,
    ShoppingCart,
    Loader2,
    Search,
    Trash2,
    MapPin,
    Clock,
    Gavel,
    ExternalLink
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, formatPrice } from '@/lib/utils';
import { db } from '@/lib/firebase/config';
import { doc, collection, query, where, getDocs, limit, addDoc, serverTimestamp, deleteDoc, setDoc, orderBy } from 'firebase/firestore';
import { useCart } from '@/context/CartContext';
import type { Product, Review, UserProfile } from '@/lib/types';
import { useViewedProducts } from '@/context/ViewedProductsContext';
import { useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import ReviewList from '@/components/reviews/ReviewList';
import ReviewForm from '@/components/reviews/ReviewForm';
import { deleteProductByAdmin } from '@/app/actions/admin';
import { recordProductView } from '@/app/actions/products';
import { incrementProductContactCount } from '@/app/actions/product-updates';
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
import { OfferModal } from '@/components/products/OfferModal';
import { GuestMessageDialog } from '@/components/product/GuestMessageDialog';
import { EbaySearchModal } from '@/components/admin/EbaySearchModal';
import { BiddingInterface } from '@/components/products/BiddingInterface';
import { acceptBidAction } from '@/app/actions/bidding';
import { getRecentViewCount } from '@/app/actions/products';
import { TrendingUp } from 'lucide-react';
import { CategoryPills } from './CategoryPills';
import { ProductHeaderInfo } from './ProductHeaderInfo';

export default function ProductDetailsModern({
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
    const [recentViews, setRecentViews] = useState<number>(0);
    const viewRecordedRef = useRef<string | null>(null);

    // Super admin check
    const isSuperAdmin = (user?.uid && SUPER_ADMIN_UIDS.includes(user.uid)) || (user?.email && SUPER_ADMIN_EMAILS.includes(user.email));
    useEffect(() => {
        const fetchRecentViews = async () => {
            try {
                const count = await getRecentViewCount(productId, 24);
                setRecentViews(count);
            } catch (error) {
                console.error("Failed to fetch recent views:", error);
            }
        };
        fetchRecentViews();
    }, [productId]);

    const productRef = useMemoFirebase(() => doc(db, 'products', productId), [productId]);
    const { data: product, isLoading: isProductLoading, error: productError } = useDoc<Product>(productRef, {
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

        addItem(product!, 1);
        toast({
            title: "Added to Cart!",
            description: `${product?.title} is now in your cart.`,
        });
    };

    const handleAcceptBid = async (bidId: string) => {
        try {
            const idToken = await getCurrentUserIdToken();
            if (!idToken) throw new Error("Authentication session expired.");

            const result = await acceptBidAction(product!.id, idToken, bidId);

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

    useEffect(() => {
        if (!productId || viewRecordedRef.current === productId) return;
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

    const isLoading = isProductLoading || isSellerLoading;

    if (isLoading && !product) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Skeleton className="h-10 w-24 mb-6" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
                    <Skeleton className="aspect-[5/7] rounded-2xl mb-4" />
                    <div className="space-y-6">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-9 w-3/4" />
                        <Skeleton className="h-10 w-1/3" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (!product) return null;

    // Helper to get formatted date relative to now
    const getRelativeTime = (date: any) => {
        if (!date) return '';
        const d = date.toDate ? date.toDate() : new Date(date);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

        if (diffInSeconds < 60) return `Just now`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        return `${Math.floor(diffInSeconds / 86400)} days ago`;
    };

    const getEbayQuery = () => {
        const parts = [];
        const title = product.title || '';
        const year = product.year?.toString() || '';
        const manufacturer = product.manufacturer || '';

        if (year && !title.startsWith(year)) parts.push(year);
        if (manufacturer && !title.toLowerCase().includes(manufacturer.toLowerCase())) parts.push(manufacturer);
        parts.push(title);
        return parts.join(' ');
    };

    return (
        <main className="min-h-screen bg-gray-50/50 dark:bg-background-dark/50 pb-16">
            <div className="max-w-7xl mx-auto px-4 pt-6">
                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-6 overflow-x-auto whitespace-nowrap pb-2">
                    <Link href="/" className="hover:text-primary transition-colors">Home</Link>
                    <span className="text-gray-300">/</span>
                    <Link href={`/browse?category=${product.category}`} className="hover:text-primary transition-colors">
                        {product.category}
                    </Link>
                    {product.subCategory && (
                        <>
                            <span className="text-gray-300">/</span>
                            <span className="text-gray-900 dark:text-gray-100">{product.subCategory}</span>
                        </>
                    )}
                </nav>

                <div className="mb-6">
                    <CategoryPills />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Left Column: Gallery & Description */}
                    <div className="lg:col-span-7 space-y-8">
                        {/* Image Gallery */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm">
                            <ProductImageGallery
                                images={product.imageUrls}
                                title={product.title}
                                isCard={product.category === 'Collector Cards'}
                                category={product.category}
                                condition={product.condition}
                            />
                        </div>

                        {/* Mobile Product Header (Title/Price) */}
                        <div className="lg:hidden">
                            <ProductHeaderInfo
                                product={product}
                                seller={seller}
                                recentViews={recentViews}
                            />
                        </div>

                        {/* Description & Specs */}
                        <div className="mt-8">
                            <div className="flex items-center gap-3 mb-4">
                                <h2 className="text-2xl font-bold">Product Description</h2>
                                <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary border-0 font-bold uppercase tracking-wider text-[10px]">
                                    {product.condition}
                                </Badge>
                            </div>

                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-8 whitespace-pre-line text-lg">
                                {product.description}
                            </p>

                            <h3 className="font-bold mb-4 text-lg">Technical Specifications</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {product.manufacturer && (
                                    <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                        <span className="text-gray-500 font-medium">Manufacturer</span>
                                        <span className="font-bold">{product.manufacturer}</span>
                                    </div>
                                )}
                                {product.year && (
                                    <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                        <span className="text-gray-500 font-medium">Year</span>
                                        <span className="font-bold">{product.year}</span>
                                    </div>
                                )}
                                {product.gradingCompany && (
                                    <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                        <span className="text-gray-500 font-medium">Grader</span>
                                        <span className="font-bold">{product.gradingCompany} {product.grade}</span>
                                    </div>
                                )}
                                <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                    <span className="text-gray-500 font-medium">Category</span>
                                    <span className="font-bold">{product.category}</span>
                                </div>
                            </div>
                        </div>

                        {/* Reviews Tab Section */}
                        <div className="mt-12">
                            <h3 className="text-2xl font-bold mb-6">Reviews ({reviews?.length || 0})</h3>
                            <ReviewForm
                                user={user}
                                productId={product.id}
                                productTitle={product.title}
                                sellerId={product.sellerId}
                            />
                            <div className="mt-6">
                                <ReviewList reviews={reviews || []} isLoading={reviewsLoading} />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Sticky Buy Box */}
                    <div className="lg:col-span-5 relative">
                        <div className="sticky top-24 space-y-6">
                            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-gray-700 shadow-xl shadow-primary/5">
                                {/* Admin Controls (eBay Search / Delete) */}
                                {isSuperAdmin && (
                                    <div className="flex justify-end gap-2 mb-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 text-blue-600 hover:bg-blue-50 gap-1"
                                            asChild
                                        >
                                            <a
                                                href={`https://www.ebay.com.au/sch/i.html?_nkw=${encodeURIComponent(getEbayQuery())}&LH_Sold=1&LH_Complete=1`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <ExternalLink className="h-4 w-4" /> eBay Sold Items
                                            </a>
                                        </Button>
                                        <EbaySearchModal
                                            defaultQuery={getEbayQuery()}
                                            trigger={
                                                <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:bg-blue-50 gap-1" title="Check eBay Prices (In-App)">
                                                    <Search className="h-4 w-4" /> eBay Check
                                                </Button>
                                            }
                                        />
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 text-red-500 hover:bg-red-50 gap-1">
                                                    <Trash2 className="h-4 w-4" /> Delete
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete this product?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleDelete} className="bg-red-600">Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                )}

                                {/* Desktop Product Header (Title/Price) */}
                                <div className="hidden lg:block">
                                    <ProductHeaderInfo
                                        product={product}
                                        seller={seller}
                                        recentViews={recentViews}
                                    />
                                </div>

                                <div className="space-y-4">
                                    {/* Stock Status */}
                                    {(!product.quantity || product.quantity === 0) && (
                                        <Alert variant="destructive" className="mb-4">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription className="font-bold">Out of Stock</AlertDescription>
                                        </Alert>
                                    )}

                                    {/* Main Buy Actions */}
                                    {(!product.isReverseBidding || user?.uid === product.sellerId) && (
                                        <div className="space-y-3">
                                            {!product.isUntimed && (product.quantity || 0) > 0 && (
                                                <Button
                                                    className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg shadow-primary/25 transition-all active:scale-[0.98]"
                                                    onClick={handleAddToCart}
                                                >
                                                    Buy Now
                                                </Button>
                                            )}

                                            {(product.isNegotiable || product.isUntimed) && (
                                                <OfferModal
                                                    product={product}
                                                    user={user}
                                                    trigger={
                                                        <Button
                                                            variant="outline"
                                                            className="w-full h-14 text-lg font-bold rounded-2xl border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                                                        >
                                                            Make Offer
                                                        </Button>
                                                    }
                                                />
                                            )}

                                            <div className="flex items-center justify-center gap-2 mt-2">
                                                <Button variant="ghost" size="icon" onClick={toggleFavorite} className={cn("rounded-full hover:bg-red-50", isFavorited && "text-red-500 bg-red-50")}>
                                                    <Heart className={cn("h-6 w-6", isFavorited && "fill-current")} />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="rounded-full hover:bg-blue-50 text-gray-500">
                                                    <Share2 className="h-6 w-6" />
                                                </Button>
                                            </div>

                                            <p className="text-center text-[11px] text-gray-400 font-medium uppercase tracking-tighter mt-2">
                                                Secured with Picksy Escrow
                                            </p>
                                        </div>
                                    )}

                                    {/* Auction Interface if Reverse Bidding */}
                                    {product.isReverseBidding && user && (
                                        <div className="mt-4">
                                            <BiddingInterface
                                                product={product}
                                                user={user}
                                                onAcceptBid={handleAcceptBid}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Seller Card */}
                            {seller && (
                                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-primary/20">
                                            <Avatar className="w-full h-full">
                                                <AvatarImage src={seller.photoURL || ''} className="object-cover" />
                                                <AvatarFallback>{seller.displayName?.[0]}</AvatarFallback>
                                            </Avatar>
                                        </div>
                                        <div>
                                            <Link href={`/seller/${seller.id}`} className="hover:underline">
                                                <h4 className="font-bold text-gray-900 dark:text-white">{seller.displayName}</h4>
                                            </Link>
                                            <div className="flex items-center gap-1 text-sm text-yellow-500">
                                                <Star className="h-4 w-4 fill-current" />
                                                <span className="font-bold text-gray-700 dark:text-gray-200">
                                                    {typeof seller.rating === 'number' ? seller.rating.toFixed(1) : '5.0'}
                                                </span>
                                                <span className="text-xs text-gray-400">({seller.totalSales || 0} sales)</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="icon" variant="secondary" className="rounded-xl h-10 w-10" onClick={handleStartConversation}>
                                            <MessageSquare className="h-5 w-5 text-gray-600" />
                                        </Button>
                                        {seller.phoneNumber && (
                                            <Button size="icon" variant="secondary" className="rounded-xl h-10 w-10" onClick={handleRevealPhone}>
                                                <Phone className="h-5 w-5 text-gray-600" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Related Items */}
            {relatedProducts.length > 0 && (
                <section className="py-16 bg-white dark:bg-gray-900/50 mt-12 border-t border-gray-100">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold">Related Items</h2>
                            <div className="flex gap-2">
                                <Button variant="outline" size="icon" className="rounded-full">
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" className="rounded-full">
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        {loadingRelated ? <ProductGridSkeleton count={4} /> : <ProductGrid products={relatedProducts} />}
                    </div>
                </section>
            )}

            {/* Trust Bar */}
            <section className="bg-primary/5 py-12 border-y border-primary/10">
                <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-primary shadow-sm">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-lg">Buyer Protection</h4>
                            <p className="text-sm text-gray-500">Secure escrow and 100% money-back guarantee.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-primary shadow-sm">
                            <CheckCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-lg">Secure Payments</h4>
                            <p className="text-sm text-gray-500">Every transaction is encrypted and verified.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-primary shadow-sm">
                            <UserGroupIcon />
                        </div>
                        <div>
                            <h4 className="font-bold text-lg">Verified Community</h4>
                            <p className="text-sm text-gray-500">Trusted neighbors, identity-verified sellers only.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Guest Message Dialog */}
            {product && seller && (
                <GuestMessageDialog
                    isOpen={isGuestMessageOpen}
                    onClose={() => setIsGuestMessageOpen(false)}
                    sellerId={seller.id}
                    productId={product.id}
                    productTitle={product.title}
                />
            )}
        </main>
    );
}

function UserGroupIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    )
}
