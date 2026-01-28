'use client';

import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, ArrowLeft, Loader2, Truck, Store } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useUser } from '@/firebase';
import { createOrderAction } from '@/app/actions/order';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';

export default function CheckoutPage() {
  const { items, cartTotal, clearCart, itemCount, setIsCartOpen, shippingMethod, setShippingMethod } = useCart();
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useUser();
  const [isPending, startTransition] = useTransition();

  const [shippingAddress, setShippingAddress] = useState({
    fullName: '',
    street: '',
    city: '',
    state: '',
    zip: '',
  });

  // Flat rate shipping logic
  const shippingCost = shippingMethod === 'shipping' ? 12.00 : 0;
  const taxRate = 0.08; 
  const taxAmount = cartTotal * taxRate;
  const totalAmount = cartTotal + shippingCost + taxAmount;

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setShippingAddress(prev => ({ ...prev, [name]: value }));
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
        toast({ title: "Please sign in to place an order.", variant: 'destructive'});
        router.push('/sign-in?redirect=/checkout');
        return;
    }

    if (shippingMethod === 'shipping') {
        if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.zip || !shippingAddress.state || !shippingAddress.fullName) {
            toast({ title: "Please fill in all shipping details.", variant: 'destructive' });
            return;
        }
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
            const result = await createOrderAction(
                cartItemsForAction, 
                idToken,
                {
                    shippingMethod,
                    shippingAddress: shippingMethod === 'shipping' ? shippingAddress : undefined
                }
            );

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
              {/* Delivery Method Selection */}
              <Card>
                  <CardHeader>
                      <CardTitle>Delivery Method</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup 
                        value={shippingMethod} 
                        onValueChange={(val) => setShippingMethod(val as 'pickup' | 'shipping')}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                        <div>
                            <RadioGroupItem value="pickup" id="pickup" className="peer sr-only" />
                            <Label
                                htmlFor="pickup"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                            >
                                <Store className="mb-3 h-6 w-6" />
                                <span className="font-semibold">Local Pickup</span>
                                <span className="text-sm text-muted-foreground mt-1">Meet Seller Directly</span>
                                <span className="text-sm font-bold text-green-600 mt-2">Free</span>
                            </Label>
                        </div>
                        <div>
                            <RadioGroupItem value="shipping" id="shipping" className="peer sr-only" />
                            <Label
                                htmlFor="shipping"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                            >
                                <Truck className="mb-3 h-6 w-6" />
                                <span className="font-semibold">Flat Rate Shipping</span>
                                <span className="text-sm text-muted-foreground mt-1">Delivered to you</span>
                                <span className="text-sm font-bold text-primary mt-2">$12.00</span>
                            </Label>
                        </div>
                    </RadioGroup>
                  </CardContent>
              </Card>

              {/* Shipping Address Form - Only if Shipping Selected */}
              {shippingMethod === 'shipping' && (
                  <Card className="animate-in fade-in slide-in-from-top-4 duration-300">
                      <CardHeader>
                          <CardTitle>Shipping Address</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                          <div className="grid gap-2">
                              <Label htmlFor="fullName">Full Name</Label>
                              <Input 
                                id="fullName" 
                                name="fullName" 
                                value={shippingAddress.fullName} 
                                onChange={handleAddressChange} 
                                required 
                                placeholder="John Doe"
                              />
                          </div>
                          <div className="grid gap-2">
                              <Label htmlFor="street">Street Address</Label>
                              <Input 
                                id="street" 
                                name="street" 
                                value={shippingAddress.street} 
                                onChange={handleAddressChange} 
                                required 
                                placeholder="123 Main St"
                              />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                  <Label htmlFor="city">City</Label>
                                  <Input 
                                    id="city" 
                                    name="city" 
                                    value={shippingAddress.city} 
                                    onChange={handleAddressChange} 
                                    required 
                                  />
                              </div>
                              <div className="grid gap-2">
                                  <Label htmlFor="state">State</Label>
                                  <Input 
                                    id="state" 
                                    name="state" 
                                    value={shippingAddress.state} 
                                    onChange={handleAddressChange} 
                                    required 
                                  />
                              </div>
                          </div>
                          <div className="grid gap-2">
                              <Label htmlFor="zip">ZIP / Postal Code</Label>
                              <Input 
                                id="zip" 
                                name="zip" 
                                value={shippingAddress.zip} 
                                onChange={handleAddressChange} 
                                required 
                              />
                          </div>
                      </CardContent>
                  </Card>
              )}

              {/* Payment Section (Mock for COD/Stripe) */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                     <p className="font-semibold">Cash on Delivery (COD) / Direct Arrangement</p>
                     <p className="text-sm text-muted-foreground mt-1">
                        {shippingMethod === 'pickup' 
                            ? "You will pay the seller directly upon meeting." 
                            : "Seller will contact you for payment (e.g., Bank Transfer, PayPal) before shipping."
                        }
                     </p>
                  </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" size="lg" className="w-full h-12 text-lg" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        Place Order (${totalAmount.toFixed(2)})
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
                    <span className="text-muted-foreground">Shipping ({shippingMethod})</span>
                    <span>{shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}</span>
                  </div>
                   <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxes (Est. 8%)</span>
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