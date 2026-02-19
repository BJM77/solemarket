'use client';

import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, ArrowLeft, Loader2, Truck, Store, ShieldCheck } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { useState, useTransition } from 'react';
import { useUser } from '@/firebase';
import { createOrderAction } from '@/app/actions/order';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { getSystemSettings, type AdminSystemSettings } from '@/app/admin/settings/actions';
import { useEffect } from 'react';
import { calculateShipping, calculateTax } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export default function CheckoutPage() {
  const { items, cartSubtotal, clearCart, itemCount, setIsCartOpen, shippingMethod, setShippingMethod } = useCart();
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useUser();
  const [isPending, startTransition] = useTransition();

  const [settings, setSettings] = useState<AdminSystemSettings>({
    freightCharge: 12.00,
    freeShippingThreshold: 150.00,
    standardTaxRate: 0.10,
  });

  useEffect(() => {
    async function loadSettings() {
      const data = await getSystemSettings();
      setSettings(data);
    }
    loadSettings();
  }, []);

  const [shippingAddress, setShippingAddress] = useState({
    fullName: '',
    street: '',
    city: '',
    state: '',
    zip: '',
  });

  // Dynamic shipping and tax logic
  const shippingCost = calculateShipping(cartSubtotal, shippingMethod, {
    freightCharge: settings.freightCharge,
    freeShippingThreshold: settings.freeShippingThreshold
  });

  const taxAmount = calculateTax(cartSubtotal, settings.standardTaxRate ?? 0.10);
  const totalAmount = cartSubtotal + shippingCost + taxAmount;

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setShippingAddress(prev => ({ ...prev, [name]: value }));
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Please sign in to place an order.", variant: 'destructive' });
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

      const cartItemsForAction = items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        dealId: item.dealId,
        bundlePrice: item.bundlePrice
      }));

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

        if (result.orders) {
          sessionStorage.setItem('lastOrders', JSON.stringify(result.orders));
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Shipping and Payment Info - Order change for mobile: Summary FIRST on mobile? No, sticky summary bottom is better. */}
          <div className="order-2 lg:order-1 space-y-8">
            <form onSubmit={handlePlaceOrder} className="space-y-8">
              {/* Delivery Method Selection */}
              <Card className="border-none shadow-premium-sm overflow-hidden rounded-2xl">
                <CardHeader className="bg-slate-50/50 border-b">
                  <CardTitle className="text-xl font-black uppercase tracking-tight">Delivery Method</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <RadioGroup
                    value={shippingMethod}
                    onValueChange={(val) => setShippingMethod(val as 'pickup' | 'shipping')}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    <div className="relative">
                      <RadioGroupItem value="pickup" id="pickup" className="peer sr-only" />
                      <Label
                        htmlFor="pickup"
                        className="flex flex-col items-center justify-center min-h-[140px] rounded-2xl border-2 border-muted bg-white p-6 transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:ring-1 peer-data-[state=checked]:ring-primary/20 cursor-pointer hover:border-primary/30"
                      >
                        <Store className="mb-3 h-8 w-8 text-primary" />
                        <span className="font-bold text-lg">Local Pickup</span>
                        <span className="text-xs text-muted-foreground mt-1 text-center font-medium">Meet Seller Locally</span>
                        <Badge variant="secondary" className="mt-3 bg-green-500 text-white border-none font-bold uppercase tracking-wider text-[10px]">Free</Badge>
                      </Label>
                    </div>
                    <div className="relative">
                      <RadioGroupItem value="shipping" id="shipping" className="peer sr-only" />
                      <Label
                        htmlFor="shipping"
                        className="flex flex-col items-center justify-center min-h-[140px] rounded-2xl border-2 border-muted bg-white p-6 transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:ring-1 peer-data-[state=checked]:ring-primary/20 cursor-pointer hover:border-primary/30"
                      >
                        <Truck className="mb-3 h-8 w-8 text-primary" />
                        <span className="font-bold text-lg">Shipping</span>
                        <span className="text-xs text-muted-foreground mt-1 text-center font-medium">Door-to-Door Delivery</span>
                        <Badge variant="secondary" className="mt-3 bg-primary text-white border-none font-bold uppercase tracking-wider text-[10px]">
                          {cartSubtotal >= settings.freeShippingThreshold ? 'FREE' : `$${formatPrice(settings.freightCharge)}`}
                        </Badge>
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* Shipping Address Form */}
              {shippingMethod === 'shipping' && (
                <Card className="border-none shadow-premium-sm overflow-hidden rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                  <CardHeader className="bg-slate-50/50 border-b">
                    <CardTitle className="text-xl font-black uppercase tracking-tight">Shipping Address</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-5">
                    <div className="grid gap-2">
                      <Label htmlFor="fullName" className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground">Full Name</Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        value={shippingAddress.fullName}
                        onChange={handleAddressChange}
                        className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                        required
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="street" className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground">Street Address</Label>
                      <Input
                        id="street"
                        name="street"
                        value={shippingAddress.street}
                        onChange={handleAddressChange}
                        className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                        required
                        placeholder="123 Main St"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="city" className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground">City</Label>
                        <Input
                          id="city"
                          name="city"
                          value={shippingAddress.city}
                          onChange={handleAddressChange}
                          className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="state" className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground">State</Label>
                        <Input
                          id="state"
                          name="state"
                          value={shippingAddress.state}
                          onChange={handleAddressChange}
                          className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="zip" className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground">ZIP / Postal Code</Label>
                      <Input
                        id="zip"
                        name="zip"
                        value={shippingAddress.zip}
                        onChange={handleAddressChange}
                        className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                        required
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payment Section */}
              <Card className="border-none shadow-premium-lg overflow-hidden rounded-2xl ring-2 ring-primary/10">
                <CardHeader className="bg-primary/5 border-b border-primary/10">
                  <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                    Payment Method
                    <Badge className="bg-primary text-white border-none font-bold uppercase tracking-wider text-[9px]">Secure ESCROW</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="bg-slate-50/50 p-5 rounded-2xl border-2 border-primary/20 shadow-sm transition-all hover:bg-white">
                    <div className="flex items-center gap-4">
                      <div className="h-5 w-5 rounded-full border-4 border-primary bg-white ring-4 ring-primary/10" />
                      <div>
                        <p className="font-bold text-gray-900">Credit / Debit Card</p>
                        <p className="text-xs text-muted-foreground font-medium">Stripe Secure Infrastructure</p>
                      </div>
                      <div className="ml-auto flex gap-1 opacity-60 grayscale hover:grayscale-0 transition-all">
                        <img src="/payment-logos/visa.svg" className="h-4 w-auto" alt="Visa" />
                        <img src="/payment-logos/mastercard.svg" className="h-4 w-auto" alt="Mastercard" />
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-muted-foreground text-center px-4 font-medium leading-relaxed">
                    By placing this order, you agree to our <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>. Funds are held in secure escrow until delivery is verified.
                  </p>
                </CardContent>
                <CardFooter className="p-6 pt-0">
                  <Button type="submit" size="lg" className="w-full h-16 text-xl font-black uppercase tracking-wider shadow-2xl shadow-primary/25 rounded-2xl transition-all active:scale-95 group" disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <ShieldCheck className="mr-2 h-6 w-6 group-hover:scale-110 transition-transform" />}
                    Pay ${formatPrice(totalAmount)}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </div>

          {/* Order Summary - Now sticky on mobile at bottom or normal on desktop? Actually, normal summary is fine if it's visible. */}
          <div className="order-1 lg:order-2 lg:sticky lg:top-24 h-fit">
            <Card className="border-none shadow-premium-sm overflow-hidden rounded-2xl">
              <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="text-xl font-black uppercase tracking-tight">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-4 group">
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-muted shrink-0 border border-slate-100 transition-transform group-hover:scale-105">
                        <Image src={item.imageUrls[0]} alt={item.title} fill className="object-cover" />
                        <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-lg shadow-lg">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 line-clamp-1 group-hover:text-primary transition-colors">{item.title}</p>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-black text-gray-900">${formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
                <Separator className="bg-slate-100" />
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Subtotal</span>
                    <span className="font-bold">${formatPrice(cartSubtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Shipping</span>
                    <span className={cn("font-bold", shippingCost === 0 ? "text-green-600" : "text-gray-900")}>
                      {shippingCost === 0 ? 'FREE' : `$${formatPrice(shippingCost)}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-sm font-bold uppercase tracking-widest italic">Taxes (Inc.)</span>
                    <span className="font-bold italic">${formatPrice(taxAmount)}</span>
                  </div>
                </div>
                <Separator className="bg-slate-100" />
                <div className="flex justify-between items-center pt-2">
                  <span className="text-lg font-black uppercase tracking-tight text-gray-900">Total</span>
                  <span className="text-2xl font-black text-primary tracking-tighter">${formatPrice(totalAmount)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="mt-6 flex items-center justify-center gap-6 opacity-40 grayscale pointer-events-none">
              <img src="/payment-logos/stripe.svg" className="h-6 w-auto" alt="Stripe" />
              <img src="/payment-logos/pci.svg" className="h-8 w-auto" alt="PCI Compliant" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}