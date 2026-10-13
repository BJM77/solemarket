import type { Metadata, Viewport } from 'next';
// Removed Plus_Jakarta_Sans import to avoid runtime undefined error
import { Outfit, Inter, Space_Grotesk, Montserrat } from 'next/font/google';
import { getPublishedSiteConfig } from '@/lib/site-config/server';
import { siteConfigCss } from '@/lib/types/site-config';
import { AnnouncementBanner } from '@/components/layout/AnnouncementBanner';
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



const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});
// Alternate fonts selectable in Brand Refresh. Not preloaded: only downloaded if a page uses them.
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter', preload: false });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], display: 'swap', variable: '--font-space-grotesk', preload: false });
const montserrat = Montserrat({ subsets: ['latin'], display: 'swap', variable: '--font-montserrat', preload: false });

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

const baseMetadata: Metadata = {
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
      { url: '/favicon.svg', type: 'image/svg+xml' },
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

/** Default title/description/share image come from the published Brand Refresh config. */
export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getPublishedSiteConfig();
  const title = seo.defaultTitle || brandConfig.seo.defaultTitle;
  const description = seo.defaultDescription || brandConfig.seo.defaultDescription;
  const img = seo.ogImageUrl ? (seo.ogImageUrl.startsWith('http') ? seo.ogImageUrl : `${siteUrl}${seo.ogImageUrl}`) : absoluteOgImage;
  return {
    ...baseMetadata,
    title: { default: title, template: `%s | ${SITE_NAME}` },
    description,
    openGraph: { ...baseMetadata.openGraph, images: [{ url: img, width: 1200, height: 630 }] },
    twitter: { ...baseMetadata.twitter, title, description, images: [img] },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Pinch-zoom must stay enabled (WCAG 1.4.4) - buyers zoom into sneaker/card photos.
  maximumScale: 5,
};

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PwaRegister } from '@/components/layout/PwaRegister';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteConfig = await getPublishedSiteConfig();
  return (
    <html lang="en-AU" suppressHydrationWarning data-scroll-behavior="smooth" className={`${outfit.variable} ${inter.variable} ${spaceGrotesk.variable} ${montserrat.variable} dark overflow-x-hidden max-w-full w-full`}>
      <head>
        {/* Published brand colours/fonts in the SSR HTML: no flash of default styles. */}
        <style id="site-config-vars" dangerouslySetInnerHTML={{ __html: siteConfigCss(siteConfig) }} />
        <link rel="preconnect" href="https://www.googleapis.com" />
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://js.stripe.com" />
        <link rel="preconnect" href="https://connect.facebook.net" />
      </head>
      <body className="font-sans antialiased overflow-x-hidden max-w-full w-full min-h-screen bg-background" suppressHydrationWarning>
        <PwaRegister />
        <StructuredData />
        <AppProviders siteConfig={siteConfig}>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:p-4 focus:bg-primary focus:text-primary-foreground focus:z-50">
            Skip to main content
          </a>
          <GoogleAnalytics />
          <FBPixel />
          <AnnouncementBanner announcement={siteConfig.announcement} />
          <Header />
          <main id="main-content" className="min-h-screen overflow-x-hidden max-w-full w-full">
            {children}
          </main>
          <Footer config={siteConfig.footer} />
          <BottomNav />
          <CartDrawer />
        </AppProviders>
      </body>
    </html>
  );
}
