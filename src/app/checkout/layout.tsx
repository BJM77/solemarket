import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Checkout and order confirmation are per-buyer pages: never indexed.
export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return children;
}
