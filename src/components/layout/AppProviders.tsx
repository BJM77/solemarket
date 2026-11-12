'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { FirebaseProvider } from '@/firebase/provider';
import QueryProvider from '@/providers/QueryProvider';
import { SiteConfigProvider } from '@/providers/SiteConfigProvider';
import { StorefrontProvider } from '@/context/StorefrontContext';
import { SidebarProvider } from '@/components/layout/sidebar-provider';
import { MobileNavProvider } from '@/context/MobileNavContext';
import { CartProvider } from '@/context/CartContext';
import { ViewedProductsProvider } from '@/context/ViewedProductsContext';
import { Toaster } from "@/components/ui/toaster";
import { TeamThemeProvider } from '@/providers/TeamThemeProvider';
import { StaleDeployGuard } from '@/components/layout/StaleDeployGuard';
import type { SiteConfig } from '@/lib/types/site-config';

export function AppProviders({ children, siteConfig }: { children: React.ReactNode; siteConfig?: SiteConfig }) {
  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <TeamThemeProvider>
        <SiteConfigProvider initialConfig={siteConfig}>
          <StorefrontProvider>
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
          </StorefrontProvider>
        </SiteConfigProvider>
        </TeamThemeProvider>
      </FirebaseProvider>
      <StaleDeployGuard />
      <Toaster />
    </ErrorBoundary>
  );
}
