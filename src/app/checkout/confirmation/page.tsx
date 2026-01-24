
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, ShoppingBag } from 'lucide-react';
import type { CartItem } from '@/context/CartContext';

interface OrderDetails {
    orderId: string;
    items: CartItem[];
    totalAmount: number;
}

export default function ConfirmationPage() {
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const router = useRouter();

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
                                    <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                                </div>
                            ))}
                        </div>
                        <Separator />
                        <div className="py-6 flex justify-between font-bold text-lg">
                            <span>Total Paid</span>
                            <span>${order.totalAmount.toFixed(2)}</span>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button size="lg" className="w-full" asChild>
                            <Link href="/">Continue Shopping</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
