import type { Metadata, Viewport } from 'next';
// Removed Plus_Jakarta_Sans import to avoid runtime undefined error
import { Outfit } from 'next/font/google';
import "./globals.css";
import { StructuredData } from '@/components/seo/StructuredData';
import { AppProviders } from '@/components/layout/AppProviders';
import { brandConfig, SITE_NAME, SITE_URL } from '@/config/brand';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { CartDrawer } from "@/components/cart/CartDrawer";
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { FacebookPixel as FBPixel } from '@/components/analytics/FacebookPixel';

// Jakarta font initialization removed; using only Outfit font.
// const jakarta = Plus_Jakarta_Sans({
//   subsets: ['latin'],
//   display: 'swap',
//   variable: '--font-jakarta',
//   weight: ['400', '500', '600', '700', '800'],
// });

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

const ogImage = brandConfig.branding.ogImageUrl || '/og-image.jpg';
const absoluteOgImage = ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`;

export const metadata: Metadata = {
  metadataBase,
  applicationName: SITE_NAME,
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: 'default',
  },
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
    images: [{ url: absoluteOgImage, width: 1200, height: 630 }],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: brandConfig.branding.faviconUrl || '/benched.png', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico'],
  },
  twitter: {
    card: "summary_large_image",
    title: brandConfig.seo.defaultTitle,
    description: brandConfig.seo.defaultDescription,
    images: [absoluteOgImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  verification: {
    google: 'OrVRv7yIsjZCar_FNT0QTNu4IzyK3Uq7vkbruEKm02o',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PwaRegister } from '@/components/layout/PwaRegister';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-AU" suppressHydrationWarning data-scroll-behavior="smooth" className={`${outfit.variable} dark`}>
      <body className="font-sans antialiased overflow-x-hidden min-h-screen bg-background" suppressHydrationWarning>
        <PwaRegister />
        <StructuredData />
        <AppProviders>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:p-4 focus:bg-primary focus:text-primary-foreground focus:z-50">
            Skip to main content
          </a>
          <GoogleAnalytics />
          <FBPixel />
          <Header />
          <main id="main-content" className="min-h-screen">
            {children}
          </main>
          <Footer />
          <BottomNav />
          <CartDrawer />
        </AppProviders>
      </body>
    </html>
  );
}
