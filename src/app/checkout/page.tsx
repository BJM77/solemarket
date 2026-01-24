
'use client';

import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, ArrowLeft, Loader2 } from 'lucide-react';
import { useId, useState, useTransition } from 'react';
import { useUser } from '@/firebase';
import type { CartItem } from '@/context/CartContext';
import { createOrderAction } from '@/app/actions/order';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';


export default function CheckoutPage() {
  const { items, cartTotal, clearCart, itemCount, setIsCartOpen } = useCart();
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useUser();
  const [isPending, startTransition] = useTransition();

  const shippingCost = cartTotal > 50 ? 0 : 7.99;
  const taxRate = 0.08; // 8% tax
  const taxAmount = cartTotal * taxRate;
  const totalAmount = cartTotal + shippingCost + taxAmount;

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
        toast({ title: "Please sign in to place an order.", variant: 'destructive'});
        router.push('/sign-in?redirect=/checkout');
        return;
    }

    startTransition(async () => {
        const idToken = await getCurrentUserIdToken();
        if (!idToken) {
            toast({ title: "Authentication session expired. Please sign in again.", variant: 'destructive' });
            router.push('/sign-in?redirect=/checkout');
            return;
        }

        const cartItemsForAction = items.map(item => ({ id: item.id, quantity: item.quantity }));
        
        try {
            const result = await createOrderAction(cartItemsForAction, idToken);

            if (result.error) {
                throw new Error(result.error);
            }
            
            // Store order details in session storage for confirmation page
            if (result.order) {
                sessionStorage.setItem('lastOrder', JSON.stringify(result.order));
            }
            
            clearCart();
            router.push('/checkout/confirmation');
            toast({
                title: 'Order Placed!',
                description: 'Thank you for your purchase. We will notify the seller.',
            });

        } catch (error: any) {
            console.error("Checkout failed: ", error);
            toast({
                title: "Order Failed",
                description: error.message || "Could not place your order at this time.",
                variant: "destructive"
            });
        }
    });
  };

  if (itemCount === 0) {
    return (
        <div className="container mx-auto px-4 py-16 text-center">
            <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Your Cart is Empty</h1>
            <p className="text-gray-600 mb-6">You can't proceed to checkout with an empty cart.</p>
            <Button asChild>
                <Link href="/">Browse Collectibles</Link>
            </Button>
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <Button variant="ghost" className="mb-6" onClick={() => setIsCartOpen(true)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cart
        </Button>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Shipping and Payment Info */}
          <div>
            <form onSubmit={handlePlaceOrder} className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Cash on Delivery (COD)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">You will pay the seller directly upon receiving the item. Please arrange a safe meeting location.</p>
                </CardContent>
                <CardFooter>
                    <Button type="submit" size="lg" className="w-full" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Place Order (COD)
                    </Button>
                </CardFooter>
              </Card>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:sticky lg:top-24 h-fit">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                    {items.map(item => (
                        <div key={item.id} className="flex items-center gap-4">
                            <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted">
                                <Image src={item.imageUrls[0]} alt={item.title} fill className="object-cover" />
                                <span className="absolute -top-2 -right-2 bg-primary text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                                    {item.quantity}
                                </span>
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
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>{shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}</span>
                  </div>
                   <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxes (Est.)</span>
                    <span>${taxAmount.toFixed(2)}</span>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
