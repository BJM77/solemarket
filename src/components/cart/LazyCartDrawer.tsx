'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useCart } from '@/context/CartContext';

// The drawer (and its bundle/pricing UI) is only needed once someone opens the cart,
// so keep it out of the first-load JS on every page.
const CartDrawer = dynamic(() => import('./CartDrawer').then((m) => m.CartDrawer), { ssr: false });

export function LazyCartDrawer() {
  const { isCartOpen } = useCart();
  const [wanted, setWanted] = useState(false);
  useEffect(() => {
    if (isCartOpen) setWanted(true);
  }, [isCartOpen]);
  return wanted || isCartOpen ? <CartDrawer /> : null;
}
