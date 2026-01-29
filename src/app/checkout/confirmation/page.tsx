
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
import { formatPrice } from '@/lib/utils';
import { lodgeDispute } from '@/app/actions/disputes';
import { useUser } from '@/firebase';
import type { CartItem } from '@/context/CartContext';

interface OrderDetails {
    orderId: string;
    items: CartItem[];
    totalAmount: number;
}

export default function ConfirmationPage() {
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [isDisputeOpen, setIsDisputeOpen] = useState(false);
    const [disputeReason, setDisputeReason] = useState('');
    const [disputeDescription, setDisputeDescription] = useState('');
    const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();

    const handleLodgeDispute = async () => {
        if (!order || !user) return;
        if (!disputeReason || !disputeDescription) {
            toast({ title: "Please fill in all fields.", variant: "destructive" });
            return;
        }

        setIsSubmittingDispute(true);
        try {
            const result = await lodgeDispute({
                orderId: order.orderId,
                initiatorId: user.uid,
                initiatorName: user.displayName || 'Unknown User',
                initiatorRole: 'buyer',
                reason: disputeReason,
                description: disputeDescription,
            });

            if (result.success) {
                toast({ title: "Dispute Lodged", description: result.message });
                setIsDisputeOpen(false);
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
        const savedOrder = sessionStorage.getItem('lastOrder');
        if (savedOrder) {
            try {
                setTimeout(() => {
                    setOrder(JSON.parse(savedOrder));
                    // Clear the session storage after retrieving it
                    sessionStorage.removeItem('lastOrder');
                }, 0);
            } catch {
                router.push('/');
            }
        } else {
            // If there's no order in session, redirect to home
            router.push('/');
        }
    }, [router]);

    if (!order) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Looking for an order?</h1>
                <p className="text-gray-600 mb-6">We can't find any recent order details.</p>
                <Button asChild>
                    <Link href="/">Continue Shopping</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="container mx-auto px-4 py-12">
                <Card className="max-w-2xl mx-auto">
                    <CardHeader className="text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-10 h-10 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Thank you for your order!</CardTitle>
                        <p className="text-muted-foreground">Your order has been placed successfully.</p>
                        <p className="text-sm text-muted-foreground pt-2">Order ID: <span className="font-mono bg-gray-100 p-1 rounded">{order.orderId}</span></p>
                    </CardHeader>
                    <CardContent>
                        <Separator />
                        <div className="py-6 space-y-4">
                            <h3 className="font-semibold">Order Summary</h3>
                            {order.items.map(item => (
                                <div key={item.id} className="flex items-center gap-4">
                                    <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted shrink-0">
                                        <Image src={item.imageUrls[0]} alt={item.title} fill className="object-cover" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium line-clamp-1">{item.title}</p>
                                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                                    </div>
                                    <p className="font-medium">${formatPrice(item.price * item.quantity)}</p>
                                </div>
                            ))}
                        </div>
                        <Separator />
                        <div className="py-6 flex justify-between font-bold text-lg">
                            <span>Total Paid</span>
                            <span>${formatPrice(order.totalAmount)}</span>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button size="lg" className="w-full" asChild>
                            <Link href="/">Continue Shopping</Link>
                        </Button>

                        <div className="w-full pt-4 border-t border-dashed">
                            <Dialog open={isDisputeOpen} onOpenChange={setIsDisputeOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-destructive flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4" />
                                        Have an issue? Dispute this order
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2">
                                            <AlertTriangle className="h-5 w-5 text-destructive" />
                                            Conflict Resolution Protocol
                                        </DialogTitle>
                                        <DialogDescription>
                                            Please provide details regarding the issue with your order. An admin will arbitrate the dispute.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Reason for Dispute</Label>
                                            <Select value={disputeReason} onValueChange={setDisputeReason}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a reason" />
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
                                            <Label>Detailed Description</Label>
                                            <Textarea
                                                placeholder="Explain the situation in detail..."
                                                value={disputeDescription}
                                                onChange={(e) => setDisputeDescription(e.target.value)}
                                                className="min-h-[120px]"
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsDisputeOpen(false)}>Cancel</Button>
                                        <Button
                                            variant="destructive"
                                            onClick={handleLodgeDispute}
                                            disabled={isSubmittingDispute}
                                        >
                                            {isSubmittingDispute ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                                            Lodge Protocol
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
