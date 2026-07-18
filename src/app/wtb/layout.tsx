import { Metadata } from 'next';
import { SITE_NAME } from '@/config/brand';

export const metadata: Metadata = {
  title: `Wanted to Buy (WTB) | ${SITE_NAME}`,
  description: `Browse active Want To Buy requests from collectors looking for specific sneakers, cards, and coins in Australia. Post your request today.`,
};

export default function WTBLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
