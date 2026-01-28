"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export interface CartItem extends Product {
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  itemCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  shippingMethod: 'pickup' | 'shipping';
  setShippingMethod: (method: 'pickup' | 'shipping') => void;
  shippingAddress: ShippingAddress | null;
  setShippingAddress: (address: ShippingAddress) => void;
  shippingCost: number;
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
    const savedCart = localStorage.getItem('picksy-cart');
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
      const savedCart = localStorage.getItem('picksy-cart');
      if (savedCart) {
        setItems(JSON.parse(savedCart));
      }
      const savedShipping = localStorage.getItem('picksy-shipping-method');
      if (savedShipping) {
        setShippingMethod(savedShipping as 'pickup' | 'shipping');
      }
      const savedAddress = localStorage.getItem('picksy-shipping-address');
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
        localStorage.setItem('picksy-cart', JSON.stringify(items));
        localStorage.setItem('picksy-shipping-method', shippingMethod);
        if (shippingAddress) {
          localStorage.setItem('picksy-shipping-address', JSON.stringify(shippingAddress));
        } else {
          localStorage.removeItem('picksy-shipping-address');
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
    toast({
      title: "Added to Cart",
      description: `${product.title} has been added to your cart.`,
    });
  }, [toast]);

  const removeItem = useCallback((productId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== productId));
    toast({
      title: "Item Removed",
      variant: "destructive",
    });
  }, [toast]);

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
    setItems([]);
    setShippingAddress(null);
    localStorage.removeItem('picksy-cart');
    localStorage.removeItem('picksy-shipping-address');
  }, []);

  const cartSubtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
  const shippingCost = shippingMethod === 'shipping' ? 12.00 : 0;
  const cartTotal = cartSubtotal + shippingCost;
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        cartTotal,
        itemCount,
        isCartOpen,
        setIsCartOpen,
        shippingMethod,
        setShippingMethod,
        shippingAddress,
        setShippingAddress,
        shippingCost
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
