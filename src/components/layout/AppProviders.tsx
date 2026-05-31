'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { FirebaseProvider } from '@/firebase/provider';
import QueryProvider from '@/providers/QueryProvider';
import { SidebarProvider } from '@/components/layout/sidebar-provider';
import { MobileNavProvider } from '@/context/MobileNavContext';
import { CartProvider } from '@/context/CartContext';
import { ViewedProductsProvider } from '@/context/ViewedProductsContext';
import { Toaster } from "@/components/ui/toaster";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <QueryProvider>
          <SidebarProvider>
            <MobileNavProvider>
              <CartProvider>
                <ViewedProductsProvider>
                  {children}
                </ViewedProductsProvider>
              </CartProvider>
            </MobileNavProvider>
          </SidebarProvider>
        </QueryProvider>
      </FirebaseProvider>
      <Toaster />
    </ErrorBoundary>
  );
}
