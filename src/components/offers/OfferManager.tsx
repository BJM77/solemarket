import { useState, useEffect, useCallback } from 'react';
import { Product, Bid } from '@/lib/types';
import { getSellerProductsWithOffers, acceptBidAction, rejectBidAction, resetOffersAction } from '@/app/actions/bidding';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, DollarSign, Clock, AlertCircle, CheckCircle, XCircle, ChevronRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
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
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';
import Image from 'next/image';

export default function OfferManager() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingBidId, setProcessingBidId] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchOffers = useCallback(async () => {
        setLoading(true);
        try {
            const idToken = await getCurrentUserIdToken();
            if (!idToken) return; // Should be handled by page auth guard

            const fetchedProducts = await getSellerProductsWithOffers(idToken);
            setProducts(fetchedProducts as Product[]); // Cast as needed if types slightly mismatch but they should match
        } catch (error) {
            console.error("Failed to fetch offers:", error);
            toast({
                title: "Error loading offers",
                description: "Could not retrieve your offers. Please try again.",
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchOffers();
    }, [fetchOffers]);

    const handleAccept = async (productId: string, bidId: string) => {
        setProcessingBidId(bidId);
        try {
            const idToken = await getCurrentUserIdToken();
            if (!idToken) throw new Error("Authentication failed");

            const result = await acceptBidAction(productId, idToken, bidId);
            if (result.success) {
                toast({
                    title: "Offer Accepted",
                    description: "You have successfully accepted the offer and sold the item!",
                });
                await fetchOffers(); // Refresh list
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                title: "Failed to Accept",
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setProcessingBidId(null);
        }
    };

    const handleReject = async (productId: string, bidId: string) => {
        setProcessingBidId(bidId);
        try {
            const idToken = await getCurrentUserIdToken();
            if (!idToken) throw new Error("Authentication failed");

            const result = await rejectBidAction(productId, idToken, bidId);
            if (result.success) {
                toast({
                    title: "Offer Declined",
                    description: "You have declined this offer.",
                });
                await fetchOffers(); // Refresh list
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                title: "Failed to Decline",
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setProcessingBidId(null);
        }
    };

    const handleReset = async (productId: string) => {
        setProcessingBidId(productId); // Using productId as a temporary flag since we are acting on the product
        try {
            const idToken = await getCurrentUserIdToken();
            if (!idToken) throw new Error("Authentication failed");

            const result = await resetOffersAction(productId, idToken);
            if (result.success) {
                toast({
                    title: "Offers Reset",
                    description: "All offers have been cleared for this item.",
                });
                await fetchOffers(); // Refresh list
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                title: "Failed to Reset",
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setProcessingBidId(null);
        }
    };

    if (loading) {
        return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (products.length === 0) {
        return (
            <Card className="text-center py-12">
                <CardContent>
                    <div className="flex justify-center mb-4">
                        <div className="bg-muted p-4 rounded-full">
                            <DollarSign className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </div>
                    <CardTitle className="mb-2">No Active Offers</CardTitle>
                    <CardDescription>
                        You don't have any pending offers on your listings right now.
                    </CardDescription>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Manage Offers</h2>
                <p className="text-muted-foreground">Review and respond to binding offers on your Bidsy items.</p>
            </div>

            <div className="grid gap-6">
                {products.map(product => {
                    const pendingBids = product.bids?.filter(b => b.status === 'pending') || [];
                    if (pendingBids.length === 0) return null;

                    return (
                        <Card key={product.id} className="overflow-hidden">
                            <div className="flex flex-col md:flex-row border-b md:border-b-0">
                                {/* Product Summary */}
                                <div className="p-6 md:w-1/3 md:border-r bg-muted/10 flex flex-col gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="relative h-20 w-20 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden border">
                                            {product.imageUrls?.[0] ? (
                                                <Image
                                                    src={product.imageUrls[0]}
                                                    alt={product.title}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-muted-foreground">No Img</div>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <Link href={`/product/${product.id}`} className="font-semibold hover:underline line-clamp-2">
                                                {product.title}
                                            </Link>
                                            <Badge variant="outline">{product.category}</Badge>
                                        </div>
                                    </div>

                                    <div className="text-sm text-muted-foreground mt-auto">
                                        <div className="flex justify-between">
                                            <span>Listed Price:</span>
                                            <span className={product.isUntimed ? 'italic' : 'font-medium'}>
                                                {product.isUntimed ? 'Make Offer' : formatPrice(product.price)}
                                            </span>
                                        </div>

                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-full mt-4 text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 dashed"
                                                >
                                                    <RefreshCw className="h-3 w-3 mr-2" />
                                                    Reset All Offers & History
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Reset All Offers?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will archive all active and rejected offers for <strong>"{product.title}"</strong>.
                                                        <br /><br />
                                                        - Active pending offers will be cancelled.
                                                        - "Highest rejected offer" history will be cleared.
                                                        - Previous bidders will be notified.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleReset(product.id)} className="bg-red-600 hover:bg-red-700">
                                                        Reset Everything
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>

                                {/* Offers List */}
                                <div className="p-6 md:w-2/3 space-y-4">
                                    <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-4">
                                        {pendingBids.length} Pending Offer{pendingBids.length !== 1 ? 's' : ''}
                                    </h3>

                                    <div className="space-y-3">
                                        {pendingBids.map(bid => (
                                            <div key={bid.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white border rounded-lg shadow-sm gap-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-2xl font-bold text-green-700">
                                                            {formatPrice(bid.amount)}
                                                        </span>
                                                        <span className="text-sm text-muted-foreground">
                                                            from {bid.bidderName}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Clock className="h-3 w-3" />
                                                        {formatDistanceToNow(bid.timestamp.toDate ? bid.timestamp.toDate() : new Date((bid.timestamp as any).seconds * 1000), { addSuffix: true })}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                className="flex-1 sm:flex-none border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                                                                disabled={processingBidId === bid.id}
                                                            >
                                                                Reject
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Decline Offer?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Are you sure you want to decline this offer of <strong>{formatPrice(bid.amount)}</strong>? This action cannot be undone.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleReject(product.id, bid.id)} className="bg-red-600 hover:bg-red-700">
                                                                    Decline
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>

                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white"
                                                                disabled={processingBidId === bid.id}
                                                            >
                                                                {processingBidId === bid.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Accept'}
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Accept Offer of {formatPrice(bid.amount)}?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This will capture the payment immediately and mark <strong>"{product.title}"</strong> as SOLD.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleAccept(product.id, bid.id)} className="bg-green-600 hover:bg-green-700">
                                                                    Accept Offer
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
