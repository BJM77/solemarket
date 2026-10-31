
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, ShoppingBag, AlertTriangle, MessageSquare, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from "@/lib/utils/format";
import { lodgeDispute } from '@/app/actions/admin/disputes';
import { useUser } from '@/firebase';
import { OrderPaymentInstructions } from '@/components/orders/OrderPaymentInstructions';

import { trackEcommerceEvent } from '@/lib/analytics';
import { useRef } from 'react';

const getStepIndex = (status: string) => {
    switch (status) {
        case 'awaiting_payment': return 0;
        case 'paid':
        case 'processing': return 1;
        case 'shipped': return 2;
        case 'delivered':
        case 'completed': return 3;
        default: return 0;
    }
};

const steps = [
    { label: 'Awaiting Payment', desc: 'PayID or cash on pickup' },
    { label: 'Paid', desc: 'Seller confirmed payment' },
    { label: 'Shipped', desc: 'Item is in transit' },
    { label: 'Delivered', desc: 'Received & finalized' }
];

export default function ConfirmationPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <ConfirmationContent />
        </Suspense>
    );
}

function ConfirmationContent() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loaded, setLoaded] = useState(false);
    const searchParams = useSearchParams();
    const orderIdsFromUrl = (searchParams?.get('orders') || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 10);
    const [isDisputeOpen, setIsDisputeOpen] = useState(false);
    const [selectedOrderForDispute, setSelectedOrderForDispute] = useState<string | null>(null);
    const [disputeReason, setDisputeReason] = useState('');
    const [disputeDescription, setDisputeDescription] = useState('');
    const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
    const trackingFired = useRef(false);

    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();

    const handleLodgeDispute = async () => {
        if (!selectedOrderForDispute || !user) return;
        if (!disputeReason || !disputeDescription) {
            toast({ title: "Please fill in all fields.", variant: "destructive" });
            return;
        }

        setIsSubmittingDispute(true);
        try {
            const idToken = await user.getIdToken();
            const result = await lodgeDispute({
                orderId: selectedOrderForDispute,
                initiatorId: user.uid,
                initiatorName: user.displayName || 'Unknown User',
                initiatorRole: 'buyer',
                reason: disputeReason,
                description: disputeDescription,
                idToken,
            });

            if (result.success) {
                toast({ title: "Dispute Lodged", description: result.message });
                setIsDisputeOpen(false);
                setSelectedOrderForDispute(null);
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmittingDispute(false);
        }
    };

    useEffect(() => {
        const savedOrders = sessionStorage.getItem('lastOrders');
        if (savedOrders) {
            try {
                const parsed = JSON.parse(savedOrders);
                const parsedOrders = Array.isArray(parsed) ? parsed : [parsed];
                setOrders(parsedOrders);

                if (!trackingFired.current) {
                    parsedOrders.forEach((o: any) => {
                        trackEcommerceEvent.purchase(
                            o.id,
                            o.totalAmount,
                            o.items,
                            o.shippingCost,
                            o.taxAmount
                        );
                    });
                    trackingFired.current = true;
                }
            } catch {
                // fall through to the URL-based fallback below
            }
        }
        setLoaded(true);
    }, [router]);

    if (!loaded) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading your order" />
            </div>
        );
    }

    // Opened in a new tab / after refresh: no session copy, but we know the order ids.
    if (orders.length === 0 && orderIdsFromUrl.length > 0) {
        return (
            <div className="min-h-screen bg-[#020617] flex flex-col items-center py-12">
                <div className="container mx-auto px-4 w-full max-w-2xl space-y-6">
                    <div className="text-center">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                        <h1 className="text-3xl font-black text-foreground">Order placed</h1>
                        <p className="text-muted-foreground mt-1">Here&apos;s how to pay. Full details are in your purchases.</p>
                    </div>
                    {orderIdsFromUrl.map(id => <OrderPaymentInstructions key={id} orderId={id} />)}
                    <Button asChild className="w-full h-12 font-bold rounded-xl"><Link href="/profile/orders">View Purchases</Link></Button>
                </div>
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <ShoppingBag className="h-16 w-16 mx-auto text-foreground/80 mb-4" />
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Looking for an order?</h1>
                <p className="text-gray-600 mb-6">We can't find any recent order details.</p>
                <Button asChild>
                    <Link href="/">Continue Shopping</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020617] flex flex-col items-center py-12">
            <div className="container mx-auto px-4 w-full">
                <div className="max-w-2xl mx-auto text-center mb-10">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                    </div>
                    <h1 className="text-4xl font-black text-foreground tracking-tight mb-2">Order Confirmed!</h1>
                    <p className="text-lg text-muted-foreground">Thank you for your purchase. We&apos;ve notified the seller.</p>
                    {orders.length > 0 && <p className="mt-2 text-sm text-foreground/80">Next step: follow the payment instructions below.</p>}
                    {orders[0]?.groupOrderId && (
                        <p className="text-xs font-mono text-muted-foreground mt-2 uppercase tracking-widest">Global Ref: {orders[0].groupOrderId}</p>
                    )}
                </div>

                <div className="max-w-2xl mx-auto space-y-6">
                    {orders.filter(o => o.status === 'awaiting_payment' && o.id).map(o => (
                        <OrderPaymentInstructions key={`pay-${o.id}`} orderId={o.id} />
                    ))}

                    {orders.map((order, idx) => (
                        <Card key={order.id || idx} className="border-border bg-[#0c1120] backdrop-blur-sm shadow-2xl overflow-hidden rounded-2xl">
                            <CardHeader className="bg-[#1e293b] text-foreground py-4 px-6 border-b border-border">
                                <div className="flex justify-between items-center">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Order Details</p>
                                        <CardTitle className="text-base font-bold text-foreground">Sold by {order.sellerName || 'Private Seller'}</CardTitle>
                                        {(order.paymentReference || order.id) && (
                                            <p className="text-xs text-foreground/80">Reference: <span className="font-mono font-bold text-foreground">{order.paymentReference || order.id}</span></p>
                                        )}
                                        <p className="text-xs text-foreground/80">
                                            Payment: {order.paymentMethod === 'payid' ? 'PayID to seller' : order.paymentMethod === 'cash' ? 'Cash on pickup (Perth)' : (order.paymentMethod || 'As arranged')}
                                        </p>
                                    </div>
                                    <Badge variant="outline" className="border-slate-600 text-foreground bg-muted/60 px-3 py-1">
                                        {String(order.status || '').replace(/_/g, ' ')}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                {/* Order progress */}
                                <div className="mb-8 bg-background/40 p-4 md:p-6 rounded-2xl border border-border">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Order Status</p>
                                    <div className="grid grid-cols-4 gap-2 relative">
                                        {/* Connection line */}
                                        <div className="absolute top-4 left-[12.5%] right-[12.5%] h-0.5 bg-muted z-0 hidden md:block" />
                                        <div 
                                            className="absolute top-4 left-[12.5%] h-0.5 bg-primary z-0 transition-all duration-500 hidden md:block" 
                                            style={{ width: `${(getStepIndex(order.status) / 3) * 75}%` }}
                                        />
                                        
                                        {steps.map((step, sIdx) => {
                                            const currentIdx = getStepIndex(order.status);
                                            const isCompleted = sIdx < currentIdx;
                                            const isActive = sIdx === currentIdx;
                                            
                                            return (
                                                <div key={sIdx} className="flex flex-col items-center text-center z-10 space-y-2">
                                                    <div 
                                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                                            isCompleted 
                                                                ? 'bg-primary text-primary-foreground shadow-[0_0_12px_rgba(37, 99, 235,0.3)]' 
                                                                : isActive 
                                                                ? 'bg-[#020617] border-2 border-primary text-primary animate-pulse' 
                                                                : 'bg-[#020617] border-2 border-border text-slate-500'
                                                        }`}
                                                    >
                                                        {sIdx + 1}
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <p className={`text-[10px] md:text-xs font-bold transition-colors ${isActive ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-slate-500'}`}>
                                                            {step.label}
                                                        </p>
                                                        <p className="text-[8px] md:text-[10px] text-slate-500 hidden md:block">
                                                            {step.desc}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {order.items.map((item: any) => (
                                        <div key={item.id} className="flex items-center gap-4 group">
                                            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0 border border-border transition-transform group-hover:scale-105">
                                                <Image src={item.image || item.imageUrls?.[0]} alt={item.title} fill className="object-cover" sizes="64px" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-foreground line-clamp-1 text-sm">{item.title}</p>
                                                <p className="text-xs text-foreground/80 font-medium">Qty: {item.quantity} · ${formatPrice(item.price)} per unit</p>
                                            </div>
                                            <p className="font-black text-foreground text-sm whitespace-nowrap">${formatPrice(item.price * item.quantity)}</p>
                                        </div>
                                    ))}
                                </div>
                                <Separator className="my-6 bg-muted" />
                                <div className="space-y-3">
                                    <div className="flex justify-between text-xs font-medium">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span className="text-foreground">${formatPrice(order.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-medium">
                                        <span className="text-muted-foreground">Shipping & Handling</span>
                                        <span className="text-foreground">{order.shippingCost === 0 ? 'Free' : `$${formatPrice(order.shippingCost)}`}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-medium">
                                        <span className="text-muted-foreground">Estimated Tax</span>
                                        <span className="text-foreground">${formatPrice(order.taxAmount)}</span>
                                    </div>
                                    <div className="flex justify-between font-black text-xl pt-2 text-foreground border-t border-border">
                                        <span>Total</span>
                                        <span className="text-primary">${formatPrice(order.totalAmount)}</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-muted/60 border-t border-border p-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-[10px] font-bold text-muted-foreground hover:text-rose-600 gap-2 h-auto py-1 px-2 transition-colors uppercase tracking-tight"
                                    onClick={() => {
                                        setSelectedOrderForDispute(order.id);
                                        setIsDisputeOpen(true);
                                    }}
                                >
                                    Lodge Conflict Protocol (Report Issue)
                                </Button>
                                {order.sellerPaypalMeLink && order.status !== 'completed' && order.status !== 'cancelled' && (
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="gap-2 h-auto py-1 px-3 bg-[#0070BA] hover:bg-[#003087] text-foreground font-bold ml-auto"
                                        asChild
                                    >
                                        <Link href={`${order.sellerPaypalMeLink}/${order.totalAmount}`} target="_blank" rel="noopener noreferrer">
                                            Pay Now with PayPal
                                        </Link>
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    ))}

                    <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-8 border-t border-border">
                        <Button size="lg" className="flex-1 font-bold rounded-xl h-12" asChild>
                            <Link href="/">Back to Marketplace</Link>
                        </Button>
                        <Button variant="outline" size="lg" className="flex-1 font-bold rounded-xl h-12 border-border text-foreground hover:bg-muted/60" asChild>
                            <Link href="/profile/orders">View Purchases</Link>
                        </Button>
                    </div>
                </div>
            </div>

            <Dialog open={isDisputeOpen} onOpenChange={setIsDisputeOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-600">
                            <AlertTriangle className="h-5 w-5" />
                            Conflict Resolution Protocol
                        </DialogTitle>
                        <DialogDescription>
                            Identify the discrepancy with this shipment. An administrator will review your claim and mediate a resolution.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-slate-500">Reason</Label>
                            <Select value={disputeReason} onValueChange={setDisputeReason}>
                                <SelectTrigger className="rounded-lg">
                                    <SelectValue placeholder="Categorize your issue" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Item not received">Item not received</SelectItem>
                                    <SelectItem value="Item not as described">Item not as described</SelectItem>
                                    <SelectItem value="Damaged during shipping">Damaged during shipping</SelectItem>
                                    <SelectItem value="Fraudulent activity">Fraudulent activity</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-slate-500">Detailed Evidence</Label>
                            <Textarea
                                placeholder="Provide as much detail as possible..."
                                value={disputeDescription}
                                onChange={(e) => setDisputeDescription(e.target.value)}
                                className="min-h-[120px] rounded-lg"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDisputeOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleLodgeDispute}
                            disabled={isSubmittingDispute}
                            className="bg-rose-600 hover:bg-rose-700 font-bold"
                        >
                            {isSubmittingDispute ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                            Initialize Protocol
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
