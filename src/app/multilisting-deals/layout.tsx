import { Metadata } from 'next';
import { SITE_NAME } from '@/config/brand';

export const metadata: Metadata = {
  title: `Multi-Listing Bundle Deals | ${SITE_NAME}`,
  description: `Unlock special discounts with our Multi-Listing Bundle Deals. Group sneakers, collector cards, or coins together to save big.`,
};

export default function MultiListingDealsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
