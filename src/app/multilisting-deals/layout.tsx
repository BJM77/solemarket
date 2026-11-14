import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Multi-Listing Bundle Deals',
  description: `Unlock special discounts with our Multi-Listing Bundle Deals. Group basketball cards and sneakers together to save big.`,
};

export default function MultiListingDealsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
