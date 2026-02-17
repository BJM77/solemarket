import type { Metadata, Viewport } from 'next';
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { ViewedProductsProvider } from "@/context/ViewedProductsContext";
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { FirebaseProvider } from '@/firebase/provider';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { SidebarProvider } from '@/components/layout/sidebar-provider';
import { Outfit } from 'next/font/google';
import QueryProvider from '@/providers/QueryProvider';
import { brandConfig, SITE_NAME, SITE_URL } from '@/config/brand';

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

// SITE_URL loaded from brand configuration
const siteUrl = SITE_URL || 'https://benched.au';

let metadataBase: URL | undefined;
try {
  metadataBase = new URL(siteUrl);
} catch (e) {
  console.error("Invalid SITE_URL for metadataBase:", siteUrl);
  metadataBase = new URL('https://benched.au');
}

export const metadata: Metadata = {
  metadataBase,
  alternates: {
    canonical: './',
    languages: {
      'en-AU': './',
    },
  },
  title: {
    default: brandConfig.seo.defaultTitle,
    template: `%s | ${SITE_NAME}`,
  },
  keywords: brandConfig.seo.keywords,
  description: brandConfig.seo.defaultDescription,
  other: {
    'geo.region': 'AU',
    'geo.placename': 'Australia',
  },
  openGraph: {
    type: 'website',
    locale: 'en_AU',
    url: './',
    siteName: SITE_NAME,
    images: [{ url: brandConfig.branding.ogImageUrl || '/og-image.jpg', width: 1200, height: 630 }],
  },
  icons: {
    icon: [
      { url: brandConfig.branding.faviconUrl || '/favicon.ico' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png' },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: brandConfig.seo.defaultTitle,
    description: brandConfig.seo.defaultDescription,
    images: [`${SITE_URL}${brandConfig.branding.ogImageUrl || '/og-image.jpg'}`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-AU" suppressHydrationWarning data-scroll-behavior="smooth" className={`${outfit.variable}`}>
      <body className="font-outfit antialiased overflow-x-hidden min-h-screen bg-background" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                '@context': 'https://schema.org',
                '@type': 'Organization',
                '@id': `${siteUrl}/#organization`,
                name: SITE_NAME,
                description: brandConfig.company.description,
                url: siteUrl,
                logo: {
                  '@type': 'ImageObject',
                  url: `${siteUrl}${brandConfig.branding.logoUrl}`,
                  width: '512',
                  height: '512'
                },
                sameAs: [
                  brandConfig.seo.facebookUrl,
                  brandConfig.seo.instagramUrl,
                  brandConfig.seo.tiktokUrl
                ].filter(Boolean),
                areaServed: {
                  '@type': 'Country',
                  name: brandConfig.contact.address.country
                },
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: brandConfig.contact.address.city,
                  addressRegion: brandConfig.contact.address.state,
                  postalCode: brandConfig.contact.address.postcode,
                  addressCountry: brandConfig.contact.address.country,
                  ...(brandConfig.contact.address.street && { streetAddress: brandConfig.contact.address.street })
                },
                contactPoint: {
                  '@type': 'ContactPoint',
                  telephone: brandConfig.contact.phone,
                  contactType: 'customer service',
                  email: brandConfig.contact.email,
                  areaServed: brandConfig.contact.address.country,
                  availableLanguage: ['English']
                }
              },
              {
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                '@id': `${siteUrl}/#website`,
                url: siteUrl,
                name: SITE_NAME,
                description: brandConfig.seo.defaultDescription,
                publisher: {
                  '@id': `${siteUrl}/#organization`
                },
                potentialAction: {
                  '@type': 'SearchAction',
                  target: {
                    '@type': 'EntryPoint',
                    urlTemplate: `${siteUrl}/search?q={search_term_string}`
                  },
                  'query-input': 'required name=search_term_string'
                }
              },
              {
                '@context': 'https://schema.org',
                '@type': 'LocalBusiness',
                '@id': `${siteUrl}/#localbusiness`,
                name: SITE_NAME,
                image: `${siteUrl}${brandConfig.branding.ogImageUrl}`,
                url: siteUrl,
                telephone: brandConfig.contact.phone,
                email: brandConfig.contact.email,
                priceRange: '$$',
                address: {
                  '@type': 'PostalAddress',
                  streetAddress: brandConfig.contact.address.street || '',
                  addressLocality: brandConfig.contact.address.city,
                  addressRegion: brandConfig.contact.address.state,
                  postalCode: brandConfig.contact.address.postcode,
                  addressCountry: brandConfig.contact.address.country
                },
                ...(brandConfig.contact.coordinates && {
                  geo: {
                    '@type': 'GeoCoordinates',
                    latitude: brandConfig.contact.coordinates.latitude,
                    longitude: brandConfig.contact.coordinates.longitude
                  }
                }),
                openingHoursSpecification: [
                  {
                    '@type': 'OpeningHoursSpecification',
                    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                    opens: '09:00',
                    closes: '17:00'
                  }
                ],
                sameAs: [
                  brandConfig.seo.facebookUrl,
                  brandConfig.seo.instagramUrl,
                  brandConfig.seo.tiktokUrl
                ].filter(Boolean)
              }
            ]),
          }}
        />
        <ErrorBoundary>
          <FirebaseProvider>
            <QueryProvider>
              <SidebarProvider>
                <CartProvider>
                  <ViewedProductsProvider>
                    <GoogleAnalytics />
                    <Header />
                    <main className="min-h-screen">
                      {children}
                    </main>
                    <Footer />
                    <BottomNav />
                    <CartDrawer />
                  </ViewedProductsProvider>
                </CartProvider>
              </SidebarProvider>
            </QueryProvider>
          </FirebaseProvider>
          <Toaster />
        </ErrorBoundary>
      </body>
    </html>
  );
}
