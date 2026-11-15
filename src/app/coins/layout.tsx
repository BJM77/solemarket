import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CoinsHeader } from '@/components/coins/CoinsHeader';
import { CoinsFooter } from '@/components/coins/CoinsFooter';
import SpotPriceTicker from '@/components/coins/SpotPriceTicker';
import { STOREFRONTS } from '@/config/storefronts';
import { coinsPublicUrl } from '@/lib/storefront-routing';

const sf = STOREFRONTS.coins;

export const metadata: Metadata = {
  metadataBase: new URL(coinsPublicUrl('/')),
  applicationName: sf.name,
  title: { default: sf.seo.title, template: `%s | ${sf.name}` },
  description: sf.seo.description,
  appleWebApp: { capable: true, title: sf.name, statusBarStyle: 'default' },
  openGraph: { type: 'website', locale: 'en_AU', siteName: sf.name, title: sf.seo.title, description: sf.seo.description, url: coinsPublicUrl('/') },
  twitter: { card: 'summary', title: sf.seo.title, description: sf.seo.description },
};

/**
 * Benched Coins storefront shell: its own ticker, header and footer. The
 * basketball header/footer/bottom nav are hidden for this segment
 * (components/layout/MainSiteOnly).
 */
export default function CoinsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-storefront="coins" className="min-h-screen bg-background">
      <Suspense fallback={null}>
        <SpotPriceTicker />
      </Suspense>
      <CoinsHeader />
      <div className="min-h-[60vh]">{children}</div>
      <CoinsFooter />
    </div>
  );
}
