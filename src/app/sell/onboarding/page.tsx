import type { Metadata } from 'next';
import SellerOnboarding from '@/components/seller/onboarding/SellerOnboarding';

export const metadata: Metadata = { title: 'Seller setup', robots: { index: false, follow: false } };

export default function SellerOnboardingPage() {
  return <SellerOnboarding />;
}
