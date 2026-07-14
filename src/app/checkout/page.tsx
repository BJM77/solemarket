'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart, ShippingAddress } from '@/context/CartContext';
import { useUser } from '@/firebase';
import { createOrderAction } from '@/app/actions/marketplace/order';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/utils';
import { Loader2, ShoppingBag, Truck, MapPin, CreditCard, Shield, ChevronLeft } from 'lucide-react';
import Image from 'next/image';

export default function CheckoutPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const { 
    items, 
    cartSubtotal, 
    cartTotal, 
    clearCart, 
    shippingMethod, 
    setShippingMethod, 
    shippingAddress, 
    setShippingAddress,
    shippingCost
  } = useCart();

  const [paymentMethod, setPaymentMethod] = useState<'Card' | 'PayID Escrow'>('Card');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Shipping Address Form State
  const [fullName, setFullName] = useState(shippingAddress?.fullName || '');
  const [street, setStreet] = useState(shippingAddress?.street || '');
  const [city, setCity] = useState(shippingAddress?.city || '');
  const [state, setState] = useState(shippingAddress?.state || '');
  const [zip, setZip] = useState(shippingAddress?.zip || '');
  const [phone, setPhone] = useState(shippingAddress?.phone || '');

  // Populate address inputs when context updates
  useEffect(() => {
    if (shippingAddress) {
      setFullName(shippingAddress.fullName);
      setStreet(shippingAddress.street);
      setCity(shippingAddress.city);
      setState(shippingAddress.state);
      setZip(shippingAddress.zip);
      setPhone(shippingAddress.phone || '');
    }
  }, [shippingAddress]);

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-slate-400">Loading your profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center px-4">
        <Card className="max-w-md w-full bg-[#0c1120] border-white/10 p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Authentication Required</h1>
            <p className="text-slate-400">Please sign in or create an account to proceed to checkout.</p>
          </div>
          <Button className="w-full h-12 font-bold" onClick={() => router.push(`/sign-in?redirect=/checkout`)}>
            Sign In
          </Button>
        </Card>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center px-4">
        <Card className="max-w-md w-full bg-[#0c1120] border-white/10 p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <ShoppingBag className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Your Cart is Empty</h1>
            <p className="text-slate-400">You don't have any items in your cart to checkout.</p>
          </div>
          <Button className="w-full h-12 font-bold" asChild>
            <Link href="/browse">Browse Marketplace</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (shippingMethod === 'shipping' && (!fullName || !street || !city || !state || !zip)) {
      toast({
        title: 'Missing Shipping Information',
        description: 'Please complete all required shipping fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const idToken = await user.getIdToken();
      const cartItemsForAction = items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        dealId: (item as any).dealId || undefined,
        bundlePrice: (item as any).bundlePrice || undefined,
      }));

      const finalAddress: ShippingAddress = {
        fullName,
        street,
        city,
        state,
        zip,
        phone: phone || undefined,
      };

      if (shippingMethod === 'shipping') {
        setShippingAddress(finalAddress);
      }

      const options = {
        shippingMethod,
        shippingAddress: shippingMethod === 'shipping' ? {
          street,
          city,
          state,
          zip,
        } : undefined,
        paymentMethod,
        idempotencyKey: `ord_${user.uid}_${Date.now()}`,
      };

      const result = await createOrderAction(cartItemsForAction, idToken, options);

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.orders) {
        toast({
          title: 'Order Placed!',
          description: 'Your order has been recorded successfully.',
        });

        // Store last orders for confirmation page
        sessionStorage.setItem('lastOrders', JSON.stringify(result.orders));
        clearCart();
        router.push('/checkout/confirmation');
      } else {
        throw new Error('Order creation failed to return order details.');
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Checkout Failed',
        description: err.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6 hover:bg-white/5 text-slate-400 hover:text-white">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <h1 className="text-3xl font-black mb-4 tracking-tight uppercase">Checkout</h1>

        {/* Escrow Trust Banner */}
        <div className="mb-8 flex items-start gap-3 bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-2xl text-emerald-300">
          <Shield className="h-6 w-6 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-emerald-200">PayID Escrow Protection Active</h3>
            <p className="text-xs text-emerald-400/80 leading-relaxed mt-1">
              Your purchase is 100% protected. Payments are held securely by Benched's escrow system. The seller is only paid after the item has been delivered and you have verified the condition of the card.
            </p>
          </div>
        </div>

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Delivery Method */}
            <Card className="bg-[#0c1120] border-white/10">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
                  <Truck className="h-5 w-5 text-primary" />
                  1. Delivery Method
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <RadioGroup 
                  value={shippingMethod} 
                  onValueChange={(val: 'pickup' | 'shipping') => setShippingMethod(val)}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <Label
                    htmlFor="pickup"
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all hover:bg-white/5 ${
                      shippingMethod === 'pickup' ? 'border-primary bg-primary/5' : 'border-white/10'
                    }`}
                  >
                    <RadioGroupItem value="pickup" id="pickup" className="mt-1" />
                    <div className="space-y-1">
                      <p className="font-bold text-white flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-slate-400" /> Local Pickup
                      </p>
                      <p className="text-xs text-slate-400">Collect in-person directly from the seller.</p>
                      <p className="text-xs font-semibold text-emerald-400">Free</p>
                    </div>
                  </Label>

                  <Label
                    htmlFor="shipping"
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all hover:bg-white/5 ${
                      shippingMethod === 'shipping' ? 'border-primary bg-primary/5' : 'border-white/10'
                    }`}
                  >
                    <RadioGroupItem value="shipping" id="shipping" className="mt-1" />
                    <div className="space-y-1">
                      <p className="font-bold text-white flex items-center gap-1.5">
                        <Truck className="h-4 w-4 text-slate-400" /> Delivery Shipping
                      </p>
                      <p className="text-xs text-slate-400">Direct courier shipping straight to your address.</p>
                      <p className="text-xs font-semibold text-primary">$12.00</p>
                    </div>
                  </Label>
                </RadioGroup>

                {shippingMethod === 'shipping' && (
                  <div className="space-y-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <h3 className="font-bold text-white text-sm">Shipping Address</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-xs font-semibold text-slate-400 uppercase">Full Name</Label>
                        <Input 
                          id="fullName" 
                          required 
                          autoComplete="name"
                          className="bg-[#020617] border-white/10" 
                          placeholder="John Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-xs font-semibold text-slate-400 uppercase">Phone Number</Label>
                        <Input 
                          id="phone" 
                          autoComplete="tel"
                          className="bg-[#020617] border-white/10" 
                          placeholder="e.g. 0400 000 000"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="street" className="text-xs font-semibold text-slate-400 uppercase">Street Address</Label>
                        <Input 
                          id="street" 
                          required 
                          autoComplete="street-address"
                          className="bg-[#020617] border-white/10" 
                          placeholder="123 Example Street"
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-xs font-semibold text-slate-400 uppercase">City</Label>
                        <Input 
                          id="city" 
                          required 
                          autoComplete="address-level2"
                          className="bg-[#020617] border-white/10" 
                          placeholder="Melbourne"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="state" className="text-xs font-semibold text-slate-400 uppercase">State</Label>
                          <Input 
                            id="state" 
                            required 
                            autoComplete="address-level1"
                            className="bg-[#020617] border-white/10" 
                            placeholder="VIC"
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="zip" className="text-xs font-semibold text-slate-400 uppercase">Postcode</Label>
                          <Input 
                            id="zip" 
                            required 
                            autoComplete="postal-code"
                            className="bg-[#020617] border-white/10" 
                            placeholder="3000"
                            value={zip}
                            onChange={(e) => setZip(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card className="bg-[#0c1120] border-white/10">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
                  <CreditCard className="h-5 w-5 text-primary" />
                  2. Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={paymentMethod} 
                  onValueChange={(val: 'Card' | 'PayID Escrow') => setPaymentMethod(val)}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <Label
                    htmlFor="payid"
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all hover:bg-white/5 ${
                      paymentMethod === 'PayID Escrow' ? 'border-primary bg-primary/5' : 'border-white/10'
                    }`}
                  >
                    <RadioGroupItem value="PayID Escrow" id="payid" className="mt-1" />
                    <div className="space-y-1">
                      <p className="font-bold text-white">PayID Escrow</p>
                      <p className="text-xs text-slate-400">Lock the item and pay securely via bank transfer. Order confirmed instantly.</p>
                      <p className="text-xs text-emerald-400 font-semibold">Highly Recommended</p>
                    </div>
                  </Label>

                  <Label
                    htmlFor="card"
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all hover:bg-white/5 ${
                      paymentMethod === 'Card' ? 'border-primary bg-primary/5' : 'border-white/10'
                    }`}
                  >
                    <RadioGroupItem value="Card" id="card" className="mt-1" />
                    <div className="space-y-1">
                      <p className="font-bold text-white">Credit / Debit Card</p>
                      <p className="text-xs text-slate-400">Quick processing via secure credit checkout gateway.</p>
                    </div>
                  </Label>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card className="bg-[#0c1120] border-white/10">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  3. Order Items
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-white/5">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-white/5">
                      <Image 
                        src={item.imageUrls[0]} 
                        alt={item.title} 
                        fill 
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-sm line-clamp-1">{item.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Quantity: {item.quantity}</p>
                    </div>
                    <p className="font-black text-sm text-white">${formatPrice(item.price * item.quantity)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <Card className="bg-[#0c1120] border-white/10 sticky top-24">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Subtotal</span>
                  <span className="text-white">${formatPrice(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Shipping</span>
                  <span className="text-white">{shippingMethod === 'pickup' ? 'Free' : `$${formatPrice(shippingCost)}`}</span>
                </div>
                <Separator className="bg-white/5" />
                <div className="flex justify-between font-black text-xl text-white">
                  <span>Total</span>
                  <span className="text-primary">${formatPrice(cartTotal)}</span>
                </div>
              </CardContent>
              <Separator className="bg-white/5" />
              <div className="p-6 space-y-4">
                <Button 
                  type="submit" 
                  className="w-full h-12 font-bold text-base uppercase rounded-xl tracking-wide shadow-lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Placing Order...
                    </span>
                  ) : (
                    'Confirm Purchase'
                  )}
                </Button>
                <p className="text-[10px] text-center text-slate-500">
                  By completing your purchase, you agree to our Terms of Service and escrow transaction protocols.
                </p>
              </div>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
}

