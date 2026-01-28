
import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { ViewedProductsProvider } from "@/context/ViewedProductsContext";
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { FirebaseProvider } from '@/firebase/provider';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { SidebarProvider } from '@/components/layout/sidebar-provider';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// SITE_URL must be set in production environment variables.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://studio-8322868971-8ca89.web.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
    languages: {
      'en-AU': '/',
    },
  },
  title: {
    default: 'Picksy | The AI-Powered Collectibles Marketplace',
    template: '%s | Picksy',
  },
  description: 'Buy, sell, and trade cards, coins, and comics with AI-assisted pricing and verification. Australia\'s premier collectibles marketplace.',
  other: {
    'geo.region': 'AU',
    'geo.placename': 'Australia',
  },
  openGraph: {
    type: 'website',
    locale: 'en_AU',
    url: '/',
    siteName: 'Picksy',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Picksy - Australia's Premier Collectibles Marketplace",
    description: "Discover unique collectibles, vintage items, trading cards, and coins. Australian marketplace with local shipping only.",
    images: [`${SITE_URL}/og-image.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-AU" suppressHydrationWarning data-scroll-behavior="smooth" className={`${inter.variable}`}>
      <body className="font-body antialiased overflow-x-hidden" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Picksy',
              description: 'Australia\'s premier collectibles marketplace',
              url: SITE_URL,
              logo: `${SITE_URL}/logo.png`,
              areaServed: {
                '@type': 'Country',
                name: 'Australia',
              },
              shippingDestination: {
                '@type': 'DefinedRegion',
                addressCountry: 'AU',
              },
            }),
          }}
        />
        <ErrorBoundary>
          <FirebaseProvider>
            <SidebarProvider>
              <CartProvider>
                <ViewedProductsProvider>
                  <GoogleAnalytics />
                  <Header />
                  <main className="min-h-screen">
                    {children}
                  </main>
                  <Footer />
                  <CartDrawer />
                </ViewedProductsProvider>
              </CartProvider>
            </SidebarProvider>
          </FirebaseProvider>
          <Toaster />
        </ErrorBoundary>
      </body>
    </html>
  );
}
