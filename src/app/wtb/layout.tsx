import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wanted to Buy (WTB)',
  description: `Browse active Want To Buy requests from collectors looking for specific sneakers and basketball cards in Australia. Post your request today.`,
};

export default function WTBLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
