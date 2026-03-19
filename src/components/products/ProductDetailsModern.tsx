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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Share2,
    Heart,
    Star,
    Store,
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
    ExternalLink,
    Mail,
    DollarSign
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { trackEcommerceEvent } from '@/lib/analytics';
import { incrementProductContactCount, recordProductEnquiry, holdProductAction } from '@/app/actions/product-updates';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { sendActionVerificationEmail } from '@/app/actions/email-verification';
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
import { QRCodeCanvas } from 'qrcode.react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { CategoryPills } from './CategoryPills';
import { ProductHeaderInfo } from './ProductHeaderInfo';
import { SizeChart } from '@/components/sneakers/SizeChart';
import { RelatedProductsCarousel } from '@/components/product/RelatedProductsCarousel';

export default function ProductDetailsModern({
    productId,
    initialProduct,
    initialSeller,
    initialReviews,
    adjacentProducts = { prevId: null, nextId: null },
    initialRelatedProducts
}: {
    productId: string;
    initialProduct: Product;
    initialSeller: UserProfile | null;
    initialReviews: Review[];
    adjacentProducts?: { prevId: string | null; nextId: string | null };
    initialRelatedProducts?: Product[];
}) {
    const router = useRouter();
    const { toast } = useToast();
    const { user, isUserLoading } = useUser();
    const { addItem } = useCart();
    const { markAsViewed } = useViewedProducts();

    const [isDeleting, setIsDeleting] = useState(false);
    const [isPhoneRevealed, setIsPhoneRevealed] = useState(false);
    const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
    const [isGuestMessageOpen, setIsGuestMessageOpen] = useState(false);
    const [isGuestVerificationOpen, setIsGuestVerificationOpen] = useState(false);
    const [guestEmail, setGuestEmail] = useState('');
    const [guestCode, setGuestCode] = useState('');
    const [verifyingGuest, setVerifyingGuest] = useState(false);
    const [recentViews, setRecentViews] = useState<number>(0);

    // Initial load of guest data
    useEffect(() => {
        const savedEmail = localStorage.getItem('guest_email');
        const savedCode = localStorage.getItem('guest_code');
        if (savedEmail) setGuestEmail(savedEmail);
        if (savedCode) setGuestCode(savedCode);
    }, []);
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

    const handleShare = useCallback((platform: 'fb' | 'ig') => {
        if (typeof window === 'undefined') return;
        const url = window.location.href;
        
        if (platform === 'fb') {
            const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
            window.open(fbShareUrl, 'facebook-share-dialog', 'width=800,height=600');
        } else {
            // Instagram doesn't have a direct URL sharer, so we copy link
            navigator.clipboard.writeText(url);
            toast({ title: "Link Copied!", description: "Share this link on your Instagram stories or bio." });
        }
    }, [toast]);

    const handleMarketplaceShare = useCallback(async () => {
        if (!product || typeof window === 'undefined') return;
        
        // Formatted for quick pasting
        const marketplaceTitle = product.title;
        const marketplacePrice = product.price.toString();
        const marketplaceDescription = `💰 Price: $${product.price}\n✨ Condition: ${product.condition}\n\n✅ Buy securely with Buyer Protection here: ${window.location.href}\n\n${product.description || ''}`;
        
        // Copy a consolidated block as a backup
        const fullPayload = `${marketplaceTitle}\n\n${marketplaceDescription}`;
        navigator.clipboard.writeText(fullPayload);
        
        // Helper to trigger image download
        const triggerDownload = async (imageUrl: string) => {
            try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = `benched-${product.title.toLowerCase().replace(/\s+/g, '-')}.jpg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);
            } catch (err) {
                console.error("Image download failed:", err);
                window.open(imageUrl, '_blank');
            }
        };

        if (product.imageUrls && product.imageUrls.length > 0) {
            await triggerDownload(product.imageUrls[0]);
        }
        
        toast({ 
            title: "Quick Share Ready!", 
            description: "1. Photo downloaded. 2. Details copied to clipboard. 3. Just PASTE into the Facebook window!" 
        });
        
        // Open FB Marketplace
        // We remove the non-functional params to avoid Facebook security flags
        window.open('https://www.facebook.com/marketplace/create/item', '_blank');
    }, [product, toast]);

    const [isPostingFB, setIsPostingFB] = useState(false);

    const handleOfficialFBPost = async () => {
        if (!user || !product) return;
        
        // Changed to allow if user is superadmin OR if user is the seller
        if (!isSuperAdmin && user.uid !== product.sellerId) {
             toast({ title: "Unauthorized", description: "You must own this listing to post it to the main page.", variant: 'destructive' });
             return;
        }

        setIsPostingFB(true);
        try {
            const idToken = await getCurrentUserIdToken();
            if (!idToken) throw new Error("Auth required");

            const response = await fetch('/api/admin/facebook/post', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    productId: product.id,
                    title: product.title,
                    imageUrl: product.imageUrls[0],
                    link: `${window.location.origin}/product/${product.id}`
                })
            });

            const result = await response.json();
            if (result.success) {
                toast({ title: "Posted to Facebook!", description: result.message });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ 
                variant: 'destructive', 
                title: "Posting Failed", 
                description: error.message 
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleStartConversation = async () => {
        if (!user || !product || !seller) {
            if (!user && product && seller) {
                // Open guest message dialog instead of forcing sign-in
                setIsGuestMessageOpen(true);
            }
            return;
        }

        // Check if user is seller/buyer and bypass verification (though message is usually direct)
        // For messaging, it's currently restricted to registered users in handleStartConversation, 
        // but let's see if we want to allow guests here too. 
        // The user said: "allow sellers to bypass... Also buyers that register... use email for non members"
        
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

    // handleAddToCart removed: Switching to direct communication model.

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
    const [isEnquiring, setIsEnquiring] = useState(false);

    const handleRevealContact = () => {
        setIsSafetyModalOpen(false); // Auto-close safety modal
        if (!user) {
            setIsGuestVerificationOpen(true);
            return;
        }

        // --- AUTHENTICATED USERS: Instant reveal for roles ---
        const role = (user as any).role || 'buyer';
        const isExempt = ['admin', 'superadmin', 'buyer', 'seller'].includes(role) || (user as any).emailVerified;

        if (isExempt) {
            setIsPhoneRevealed(true);
            // Track contact revealed for registered users
            trackEcommerceEvent.contactRevealed(product);
        } else {
            // Need to show "verify email" step in modal for new/unverified members
            setIsGuestVerificationOpen(true);
        }
    };

    const handleGuestVerifyAndReveal = async () => {
        if (!guestEmail || !guestCode) {
            toast({ title: "Missing Information", description: "Please enter both email and verification code.", variant: "destructive" });
            return;
        }

        setVerifyingGuest(true);
        try {
            const result = await recordProductEnquiry(productId, undefined, guestEmail, guestCode);
            
            if (result.success) {
                // Persist successful guest verification
                localStorage.setItem('guest_email', guestEmail);
                localStorage.setItem('guest_code', guestCode);

                setIsPhoneRevealed(true);
                setIsGuestVerificationOpen(false);
                
                // Track contact revealed for guest after verification
                trackEcommerceEvent.contactRevealed(product);

                toast({
                    title: "Hold Active (5 Mins)",
                    description: "You have a 5-minute window to contact the seller."
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: "Verification Failed",
                    description: result.error
                });
            }
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setVerifyingGuest(false);
        }
    };

    const handleSendGuestCode = async () => {
        if (!guestEmail || !guestEmail.includes('@')) {
            toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
            return;
        }
        setVerifyingGuest(true);
        try {
            const result = await sendActionVerificationEmail(guestEmail);
            if (result.success) {
                toast({ title: "Code Sent", description: "Check your email for the verification code." });
            } else {
                toast({ title: "Error", description: result.error, variant: "destructive" });
            }
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setVerifyingGuest(false);
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
                trackEcommerceEvent.viewItem(product);
            } catch (error) {
                console.error("Failed to record product view:", error);
            }
        };
        if (product) {
            recordView();
        }
    }, [productId, user?.uid, product]);

    useEffect(() => {
        if (product) {
            markAsViewed(productId);
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
        <main className="min-h-screen bg-background pb-16">
            <Dialog open={isSafetyModalOpen} onOpenChange={setIsSafetyModalOpen}>
                <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl rounded-3xl">
                    <DialogHeader className="text-center pt-4">
                        <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                            <ShieldCheck className="h-8 w-8 text-amber-600" />
                        </div>
                        <DialogTitle className="text-2xl font-black text-slate-900">Safety First</DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">
                            To keep our community safe, please follow these guidelines for local collection:
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex gap-3 items-start bg-slate-50 p-4 rounded-2xl">
                            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0 font-bold text-xs">1</div>
                            <p className="text-sm text-slate-700">Meet in a <b>public, well-lit place</b> (e.g., a Police Station lobby or busy cafe).</p>
                        </div>
                        <div className="flex gap-3 items-start bg-slate-50 p-4 rounded-2xl">
                            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0 font-bold text-xs">2</div>
                            <p className="text-sm text-slate-700">Thoroughly <b>inspect the item</b> before handing over any cash.</p>
                        </div>
                        <div className="flex gap-3 items-start bg-slate-50 p-4 rounded-2xl">
                            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0 font-bold text-xs">3</div>
                            <p className="text-sm text-slate-700">By proceeding, you agree to place a <b>5-minute hold</b> on this item.</p>
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-center">
                        <Button 
                            className="w-full h-12 rounded-2xl bg-slate-900 text-white font-bold text-lg"
                            onClick={handleRevealContact}
                            disabled={isEnquiring}
                        >
                            {isEnquiring ? <Loader2 className="h-5 w-5 animate-spin" /> : "I Understand, Proceed"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={isGuestVerificationOpen} onOpenChange={setIsGuestVerificationOpen}>
                <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl rounded-3xl">
                    <DialogHeader className="text-center pt-4">
                        <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                            <Mail className="h-8 w-8 text-indigo-600" />
                        </div>
                        <DialogTitle className="text-2xl font-black text-slate-900">Guest Verification</DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">
                            Verify your email to contact the seller.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="guest-email" className="text-sm font-bold ml-1 text-slate-700">Your Email</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="guest-email"
                                    placeholder="your@email.com"
                                    value={guestEmail}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGuestEmail(e.target.value)}
                                    className="rounded-xl h-12 border-slate-200"
                                />
                                <Button 
                                    variant="outline" 
                                    className="rounded-xl h-12 px-4 whitespace-nowrap border-2 font-bold"
                                    onClick={handleSendGuestCode}
                                    disabled={verifyingGuest}
                                >
                                    Get Code
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="guest-code" className="text-sm font-bold ml-1 text-slate-700">Verification Code</Label>
                            <Input
                                id="guest-code"
                                placeholder="5-digit code"
                                value={guestCode}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGuestCode(e.target.value)}
                                className="rounded-xl h-12 border-slate-200 text-center text-xl font-bold tracking-widest"
                                maxLength={5}
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 text-center font-medium leading-relaxed">
                            By verifying, you agree to our terms. This interaction will be logged for safety.
                        </p>
                    </div>
                    <DialogFooter className="sm:justify-center">
                        <Button 
                            className="w-full h-12 rounded-2xl bg-slate-900 text-white font-bold text-lg hover:bg-slate-800 transition-all active:scale-[0.98]"
                            onClick={handleGuestVerifyAndReveal}
                            disabled={verifyingGuest || !guestEmail || !guestCode}
                        >
                            {verifyingGuest ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify & Reveal Phone"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="max-w-7xl mx-auto px-4 pt-6">
                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-6 overflow-x-auto whitespace-nowrap pb-2">
                    <Link href="/" className="hover:text-primary transition-colors">Home</Link>
                    <span className="text-gray-300">/</span>
                    <Link href={product.category === 'Collector Cards' ? '/cards' : `/browse?category=${encodeURIComponent(product.category)}`} className="hover:text-primary transition-colors">
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

                        {/* The description and specs have been moved to the right column as per the request */}
                    </div>

                    {/* Right Column: Sticky Buy Box */}
                    <div className="lg:col-span-5 relative">
                        <div className="sticky top-24 space-y-6">
                            {/* Back Button */}
                            <div className="flex justify-end mb-4">
                                <Button
                                    variant="ghost"
                                    className="text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                    onClick={() => router.back()}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Back to previous
                                </Button>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-gray-700 shadow-xl shadow-primary/5">
                                {/* Controls (eBay Search / Admin Delete) */}
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
                                    {isSuperAdmin && (
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
                                    )}
                                </div>

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
                                        <div className="mb-4 flex items-center gap-3 border border-destructive/20 bg-destructive/5 text-destructive p-4 rounded-lg">
                                            <AlertCircle className="h-4 w-4" />
                                            <p className="font-bold text-sm">Out of Stock</p>
                                        </div>
                                    )}

                                    {/* Main Buy Actions */}
                                    {(!product.isReverseBidding || user?.uid === product.sellerId) && (
                                        <div className="space-y-3">
                                            {!product.isUntimed && (product.quantity || 0) > 0 && (() => {
                                                const holdExpiresAt = (product as any).holdExpiresAt?.toDate();
                                                const isCurrentlyHeld = holdExpiresAt && holdExpiresAt > new Date();
                                                const heldByMe = (product as any).heldBy === user?.uid;
                                                const reason = (product as any).holdReason;

                                                if (isCurrentlyHeld && !heldByMe) {
                                                    return (
                                                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center">
                                                            <p className="text-slate-800 font-bold text-sm flex items-center justify-center gap-2">
                                                                <Clock className="h-4 w-4" /> Temporarily Reserved
                                                            </p>
                                                            <p className="text-slate-500 text-[10px] uppercase tracking-wider font-black">
                                                                {reason === 'negotiation' ? 'Under negotiation' : 'A buyer is contacting the seller'}
                                                            </p>
                                                        </div>
                                                    );
                                                }

                                                const isPending = (product as any).enquiryStatus === 'pending';

                                                if (isPending) {
                                                    return (
                                                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-center">
                                                            <p className="text-amber-800 font-bold text-sm">Under Offer</p>
                                                            <p className="text-amber-700 text-[10px] uppercase tracking-wider font-black">Seller is finalising a deal</p>
                                                        </div>
                                                    );
                                                }

                                                if (isCurrentlyHeld && !heldByMe) {
                                                    return (
                                                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center">
                                                            <p className="text-slate-800 font-bold text-sm flex items-center justify-center gap-2">
                                                                <Clock className="h-4 w-4" /> Temporarily Reserved
                                                            </p>
                                                            <p className="text-slate-500 text-[10px] uppercase tracking-wider font-black">A buyer is contacting the seller</p>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div className="space-y-3">
                                                        <Button
                                                            className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg shadow-indigo-600/25 bg-indigo-600 hover:bg-indigo-700 text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                                            onClick={handleStartConversation}
                                                        >
                                                            <MessageSquare className="h-5 w-5" />
                                                            Message Seller
                                                        </Button>
                                                        
                                                        <Button
                                                            variant="outline"
                                                            className="w-full h-14 text-lg font-bold rounded-2xl border-2 border-primary/20 hover:bg-primary/5 gap-2"
                                                            onClick={() => setIsSafetyModalOpen(true)}
                                                            disabled={isEnquiring || isPhoneRevealed || (isCurrentlyHeld && !heldByMe)}
                                                        >
                                                            {isEnquiring ? <Loader2 className="h-5 w-5 animate-spin" /> : <Phone className="h-5 w-5" />}
                                                            {isPhoneRevealed || (isCurrentlyHeld && heldByMe) ? "Phone Number Revealed" : "Contact via SMS/Call"}
                                                        </Button>

                                                        {(product.isNegotiable || product.isUntimed) && (
                                                            <OfferModal
                                                                product={product}
                                                                user={user}
                                                                trigger={
                                                                    <Button
                                                                        variant="outline"
                                                                        className="w-full h-14 text-lg font-bold rounded-2xl border-2 border-indigo-600/20 hover:bg-indigo-50 text-indigo-700 gap-2"
                                                                    >
                                                                        <DollarSign className="h-5 w-5" />
                                                                        Make an Offer
                                                                    </Button>
                                                                }
                                                            />
                                                        )}

                                                        {(isPhoneRevealed || (isCurrentlyHeld && heldByMe)) && (
                                                            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 p-4 rounded-2xl animate-in fade-in slide-in-from-top-2">
                                                                <p className="text-indigo-900 dark:text-indigo-100 font-bold text-sm mb-1 flex justify-between items-center">
                                                                    <span>Next Steps:</span>
                                                                    {isCurrentlyHeld && (
                                                                        <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 text-[10px] font-black">
                                                                            HOLD ACTIVE
                                                                        </Badge>
                                                                    )}
                                                                </p>
                                                                <p className="text-indigo-700 dark:text-indigo-300 text-xs leading-relaxed mb-3">
                                                                    Call or SMS the seller to arrange payment and delivery. When you meet, show them this QR code to finalize the sale.
                                                                </p>
                                                                
                                                                <div className="bg-white p-3 rounded-xl mb-3 flex flex-col items-center gap-2">
                                                                    <QRCodeCanvas 
                                                                        value={`${window.location.origin}/api/seller/quick-action?productId=${product.id}&token=${(product as any).quickActionToken}&action=sold`}
                                                                        size={120}
                                                                        level="H"
                                                                    />
                                                                    <span className="text-[9px] font-black uppercase text-slate-400">Proof of Sale</span>
                                                                </div>

                                                                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 rounded-xl" asChild>
                                                                    <a href={`tel:${(product as any).phoneNumber || seller?.phoneNumber}`}>
                                                                        Call Seller Now
                                                                    </a>
                                                                </Button>
                                                            </div>
                                                        )}

                                                        <p className="text-[10px] text-center text-muted-foreground font-medium uppercase tracking-widest">
                                                            Payments are made directly to the seller. Benched does not process payments at this stage.
                                                        </p>
                                                    </div>
                                                );
                                            })()}

                                            <div className="flex items-center justify-center gap-2 mt-2">
                                                <Button variant="ghost" size="icon" onClick={toggleFavorite} className={cn("rounded-full hover:bg-red-50", isFavorited && "text-red-500 bg-red-50")}>
                                                    <Heart className={cn("h-6 w-6", isFavorited && "fill-current")} />
                                                </Button>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-blue-50 text-blue-600" title="Share to Facebook">
                                                            {isPostingFB ? <Loader2 className="h-6 w-6 animate-spin" /> : <Share2 className="h-6 w-6" />}
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-56">
                                                        <DropdownMenuItem onClick={() => handleShare('fb')} className="cursor-pointer">
                                                            Post to Profile Feed
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={handleMarketplaceShare} className="cursor-pointer">
                                                            Create Marketplace Listing
                                                        </DropdownMenuItem>
                                                        {(isSuperAdmin || user?.uid === product.sellerId) && (
                                                            <DropdownMenuItem onClick={handleOfficialFBPost} className="cursor-pointer text-blue-600 font-medium">
                                                                Send to Benched Page
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>

                                                <Button variant="ghost" size="icon" onClick={() => handleShare('ig')} className="rounded-full hover:bg-pink-50 text-pink-600" title="Copy Link for Instagram">
                                                    <ExternalLink className="h-6 w-6" />
                                                </Button>
                                            </div>

                                            <div className="flex items-center justify-center gap-1.5 mt-3 text-emerald-600 bg-emerald-50 py-2 rounded-lg">
                                                <CheckCircle className="h-3.5 w-3.5" />
                                                <p className="text-[11px] font-bold uppercase tracking-wide">
                                                    Secure Peer-to-Peer Trade
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Auction Interface if Reverse Bidding */}
                                    {product.isReverseBidding && (
                                        <div className="mt-4">
                                            <BiddingInterface
                                                product={product}
                                                user={user}
                                                onAcceptBid={handleAcceptBid}
                                            />
                                        </div>
                                    )}

                                    {/* Consolidated Product Description & Specs */}
                                    <div className="pt-6 mt-6 border-t border-gray-100 dark:border-gray-700 space-y-6">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <h2 className="text-lg font-bold">Listing Details</h2>
                                                <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-0 font-bold uppercase tracking-wider text-[10px]">
                                                    {product.condition}
                                                </Badge>
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line text-sm">
                                                {product.description}
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 uppercase tracking-wider">Specifications</h3>
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl">
                                                    <span className="text-gray-500 block text-xs mb-1">Category</span>
                                                    <span className="font-bold">{product.category}</span>
                                                </div>
                                                {product.subCategory && (
                                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl">
                                                        <span className="text-gray-500 block text-xs mb-1">Sub-Category</span>
                                                        <span className="font-bold">{product.subCategory}</span>
                                                    </div>
                                                )}
                                                {(product.brand || product.manufacturer) && (
                                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl">
                                                        <span className="text-gray-500 block text-xs mb-1">Brand</span>
                                                        <span className="font-bold">{product.brand || product.manufacturer}</span>
                                                    </div>
                                                )}
                                                {product.size && (
                                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl flex items-center justify-between">
                                                        <div>
                                                            <span className="text-gray-500 block text-xs mb-1">Size (US Men)</span>
                                                            <span className="font-bold text-primary">{product.size}</span>
                                                        </div>
                                                        <SizeChart brand={product.brand?.toLowerCase()} />
                                                    </div>
                                                )}
                                                {product.model && (
                                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl">
                                                        <span className="text-gray-500 block text-xs mb-1">Model</span>
                                                        <span className="font-bold truncate block" title={product.model}>{product.model}</span>
                                                    </div>
                                                )}
                                                {product.styleCode && (
                                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl">
                                                        <span className="text-gray-500 block text-xs mb-1">Style Code</span>
                                                        <span className="font-bold">{product.styleCode}</span>
                                                    </div>
                                                )}
                                                {product.colorway && (
                                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl col-span-2">
                                                        <span className="text-gray-500 block text-xs mb-1">Colorway</span>
                                                        <span className="font-bold">{product.colorway}</span>
                                                    </div>
                                                )}
                                                {product.year && (
                                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl">
                                                        <span className="text-gray-500 block text-xs mb-1">Release Year</span>
                                                        <span className="font-bold">{product.year}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
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
                                        <Button size="default" variant="outline" className="rounded-xl h-10 font-bold" asChild>
                                            <Link href={`/shop/${(seller as any).shopSlug || seller.id}`}>
                                                <Store className="h-4 w-4 mr-2" />
                                                View Shop
                                            </Link>
                                        </Button>
                                        <Button size="icon" variant="secondary" className="rounded-xl h-10 w-10 shrink-0" onClick={handleStartConversation}>
                                            <MessageSquare className="h-5 w-5 text-gray-600" />
                                        </Button>
                                        {seller.phoneNumber && (
                                            <Button
                                                size="icon"
                                                variant="secondary"
                                                className={cn(
                                                    "rounded-xl h-10 transition-all duration-300",
                                                    isPhoneRevealed ? "w-auto px-4 gap-2" : "w-10"
                                                )}
                                                onClick={handleRevealContact}
                                            >
                                                <Phone className="h-5 w-5 text-gray-600 shrink-0" />
                                                {isPhoneRevealed && <span className="font-bold text-gray-800 dark:text-gray-200">{seller.phoneNumber}</span>}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}

                            </div>
                        </div>
                    </div>

                    {/* Reviews Tab Section - Moved here for full width */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 border border-gray-100 dark:border-gray-700 shadow-sm mt-8">
                        <h3 className="text-xl font-bold mb-6">Reviews ({reviews?.length || 0})</h3>
                        <ReviewForm
                            user={user}
                            productId={product.id}
                            productTitle={product.title}
                            sellerId={product.sellerId}
                        />
                        <div className="mt-6 space-y-4">
                            <ReviewList reviews={reviews || []} isLoading={reviewsLoading} />
                        </div>
                    </div>
                </div>

            {/* Related Items (Server Side Rendered for SEO) */}
            {initialRelatedProducts && initialRelatedProducts.length > 0 && (
                <RelatedProductsCarousel products={initialRelatedProducts} />
            )}

            {/* Trust Bar */}
            <section className="bg-primary/5 py-12 border-y border-primary/10">
                <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-primary shadow-sm">
                            <CheckCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-lg">Verified Sellers</h4>
                            <p className="text-sm text-gray-500">Identity-verified local sneakerheads you can trust.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-primary shadow-sm">
                            <UserGroupIcon />
                        </div>
                        <div>
                            <h4 className="font-bold text-lg">Community Driven</h4>
                            <p className="text-sm text-gray-500">The safest way to rotate your rotation in Australia.</p>
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
