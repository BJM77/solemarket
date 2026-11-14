import type { Metadata } from 'next';
import { pageOpenGraph } from '@/lib/seo/og';

const title = 'Latest Deals on Cards & Sneakers';
const description = 'The newest basketball card and sneaker listings from Australian sellers on Benched. Pay the seller directly by PayID or cash on pickup.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/deals' },
  openGraph: pageOpenGraph({ title, description, path: '/deals' }),
};

export default function DealsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
