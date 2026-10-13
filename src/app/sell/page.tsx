import type { Metadata } from 'next';
import SellLandingPage from '@/components/sell/SellLanding';

// Public, indexable landing page. Only the selling tools under /sell/* require sign-in
// (see src/middleware.ts).
export const metadata: Metadata = {
  title: 'Sell Sneakers & Collector Cards in Australia',
  description:
    'Sell your sneakers, basketball shoes and collector cards on Benched. AI-assisted listings from your phone camera, verified buyers and Australia-wide shipping.',
  alternates: { canonical: '/sell' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Sell on Benched',
    description: 'List sneakers and collector cards in minutes. Australian buyers, secure checkout.',
    type: 'website',
  },
};

export default function SellPage() {
  return <SellLandingPage />;
}
