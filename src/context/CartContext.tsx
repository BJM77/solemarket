"use client";
/**
 * CART PERSISTENCE STRATEGY:
 * Currently, the cart is strictly persisted in `localStorage` for both guests and 
 * signed-in users. This ensures zero-latency cart updates and works offline.
 * 
 * DESIGN DECISION (from Review #8):
 * Using localStorage as the source of truth is fine for initial MVP. However, to 
 * support true multi-device checkout (e.g. add on mobile, checkout on desktop),
 * we will eventually need to sync this state to Firestore under the user's profile.
 * 
 * TODO: Add a background sync effect when a user is authenticated to push/pull
 * cart items between localStorage and users/{uid}/profile/cart.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { priceCart, splitProRata, type CartPricing } from '@/lib/bundles';
import { cartItemsToLines } from '@/lib/order-pricing';
import { getActiveBundlesForSellers } from '@/app/actions/marketplace/bundle-actions';
import type { FixedPriceBundle } from '@/types/bundles';
import { useTierSettings } from '@/hooks/use-tier-settings';
import { calculateCombinedShipping, DEFAULT_SHIPPING_SETTINGS, type ShippingSettings } from '@/lib/pricing';
import { getShippingSettings } from '@/app/actions/marketplace/shipping-settings';
import { holdCartItemAction, releaseCartHoldAction } from '@/app/actions/marketplace/cart-hold';
import { getIdTokenLazy } from '@/lib/firebase/lazy';

export interface CartItem extends Product {
  quantity: number;
  /** When the server-side 30-min cart hold expires (ms). Only set once the server confirms it. */
  holdExpiresAtMs?: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  addBundle: (deal: any, products: Product[]) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartSubtotal: number;
  /** Line-by-line pricing (bundles + multibuy), same engine the server uses. */
  pricing: CartPricing;
  /** Live fixed-price bundles for sellers in the cart. */
  bundles: FixedPriceBundle[];
  cartTotal: number;
  itemCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  shippingMethod: 'pickup' | 'shipping';
  setShippingMethod: (method: 'pickup' | 'shipping') => void;
  shippingAddress: ShippingAddress | null;
  setShippingAddress: (address: ShippingAddress) => void;
  shippingCost: number;
  /** Number of sellers in the cart (one combined shipping fee each). */
  shippingSellerCount: number;
  freeShippingThreshold: number;
}

export interface ShippingAddress {
  fullName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const getInitialCart = (): CartItem[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const savedCart = localStorage.getItem('benched-cart');
    return savedCart ? JSON.parse(savedCart) : [];
  } catch (error) {
    console.error("Failed to load cart from localStorage on init", error);
    return [];
  }
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [shippingMethod, setShippingMethod] = useState<'pickup' | 'shipping'>('pickup');
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null);
  const { toast } = useToast();
  const hasLoaded = useRef(false);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('benched-cart');
      if (savedCart) {
        setItems(JSON.parse(savedCart));
      }
      const savedShipping = localStorage.getItem('benched-shipping-method');
      if (savedShipping) {
        setShippingMethod(savedShipping as 'pickup' | 'shipping');
      }
      const savedAddress = localStorage.getItem('benched-shipping-address');
      if (savedAddress) {
        setShippingAddress(JSON.parse(savedAddress));
      }
    } catch (error) {
      console.error("Failed to load cart from localStorage", error);
    } finally {
      hasLoaded.current = true;
    }
  }, []);

  useEffect(() => {
    if (hasLoaded.current) {
      try {
        localStorage.setItem('benched-cart', JSON.stringify(items));
        localStorage.setItem('benched-shipping-method', shippingMethod);
        if (shippingAddress) {
          localStorage.setItem('benched-shipping-address', JSON.stringify(shippingAddress));
        } else {
          localStorage.removeItem('benched-shipping-address');
        }
      } catch (error) {
        console.error("Failed to save cart to localStorage", error);
        toast({
          title: "Cart Save Failed",
          description: "Your cart couldn't be saved locally. It might be full.",
          variant: "destructive"
        });
      }
    }
  }, [items, shippingMethod, shippingAddress, toast]);

  const addItem = useCallback((product: Product, quantity: number = 1) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);
      if (existingItem) {
        return prevItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevItems, { ...product, quantity }];
    });

    // Signed-in buyers get a real 30-minute server hold (guests don't). The countdown is shown
    // only once the server confirms it, so the cart never claims a hold that doesn't exist.
    getIdTokenLazy()
      .then((idToken) => (idToken ? holdCartItemAction({ productId: product.id, idToken }) : null))
      .then((res) => {
        if (!res?.success || !res.expiresAtMs) return;
        const expiresAtMs = res.expiresAtMs;
        setItems((prev) => prev.map((item) => (item.id === product.id ? { ...item, holdExpiresAtMs: expiresAtMs } : item)));
      })
      .catch(() => null);

    toast({
      title: "Added to Cart",
      description: `${product.title} has been added to your cart.`,
    });
  }, [toast]);

  const addBundle = useCallback((deal: any, products: Product[]) => {
    setItems((prevItems) => {
      // Create unique ID for this bundle instance to allow multiple of same deal
      const bundleInstanceId = `${deal.id}-${Date.now()}`;
      
      // Calculate pro-rated price for each item in the bundle
      // Display estimate only; the server re-validates the deal and splits the price itself.
      const shares = splitProRata(Math.round(Math.min(deal.price, products.reduce((s, p) => s + p.price, 0)) * 100), products.map(p => Math.round(p.price * 100)));
      const bundleItems = products.map((p, idx) => ({
        ...p,
        quantity: 1,
        dealId: bundleInstanceId,
        bundlePrice: shares[idx] / 100,
      }));
      return [...prevItems, ...bundleItems];
    });
    toast({
      title: "Bundle Added",
      description: `${deal.name} has been added to your cart.`,
    });
  }, [toast]);

  const releaseHolds = useCallback((productIds: string[]) => {
    if (!productIds.length) return;
    getIdTokenLazy()
      .then((idToken) => {
        if (!idToken) return;
        productIds.forEach((productId) => { releaseCartHoldAction({ productId, idToken }).catch(() => null); });
      })
      .catch(() => null);
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prevItems) => {
      if (prevItems.some((item) => item.id === productId && item.holdExpiresAtMs)) releaseHolds([productId]);
      return prevItems.filter((item) => item.id !== productId);
    });
    toast({
      title: "Item Removed",
      variant: "destructive",
    });
  }, [toast, releaseHolds]);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems((prevItems) => {
      releaseHolds(prevItems.filter((item) => item.holdExpiresAtMs && item.holdExpiresAtMs > Date.now()).map((item) => item.id));
      return [];
    });
    setShippingAddress(null);
    localStorage.removeItem('benched-cart');
    localStorage.removeItem('benched-shipping-address');
  }, [releaseHolds]);

  // Fixed-price bundles for the sellers in the cart (refetched when the seller set changes).
  const [bundles, setBundles] = useState<FixedPriceBundle[]>([]);
  const sellerKey = Array.from(new Set(items.map(i => i.sellerId).filter(Boolean))).sort().join(',');
  useEffect(() => {
    let cancelled = false;
    if (!sellerKey) { setBundles([]); return; }
    getActiveBundlesForSellers(sellerKey.split(','))
      .then(b => { if (!cancelled) setBundles(b); })
      .catch(() => { if (!cancelled) setBundles([]); });
    return () => { cancelled = true; };
  }, [sellerKey]);

  // Shared pricing engine (src/lib/bundles.ts) - identical to createOrderAction.
  const tierSettings = useTierSettings();
  const pricing = React.useMemo(() => priceCart(cartItemsToLines(items as any), bundles, { tierSettings }), [items, bundles, tierSettings]);
  const cartSubtotal = pricing.subtotal;

  // Combined shipping: one fee per seller (same rule as createOrderAction).
  const [shipSettings, setShipSettings] = useState<ShippingSettings>(DEFAULT_SHIPPING_SETTINGS);
  useEffect(() => {
    let cancelled = false;
    getShippingSettings().then(s => { if (!cancelled) setShipSettings(s); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const shipping = React.useMemo(() => calculateCombinedShipping(
    pricing.lines.map(l => ({ sellerId: items[l.index]?.sellerId, total: l.total })),
    shippingMethod,
    shipSettings,
  ), [pricing, items, shippingMethod, shipSettings]);
  const shippingCost = shipping.total;
  const shippingSellerCount = shipping.sellerCount;
  const cartTotal = cartSubtotal + shippingCost;
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        addBundle,
        removeItem,
        updateQuantity,
        clearCart,
        cartSubtotal,
        pricing,
        bundles,
        cartTotal,
        itemCount,
        isCartOpen,
        setIsCartOpen,
        shippingMethod,
        setShippingMethod,
        shippingAddress,
        setShippingAddress,
        shippingCost,
        shippingSellerCount,
        freeShippingThreshold: shipSettings.freeShippingThreshold,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
