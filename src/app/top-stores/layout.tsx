import type { Metadata } from 'next';
import { pageOpenGraph } from '@/lib/seo/og';

const title = 'Stores – Australian Card & Sneaker Sellers';
const description = 'Browse the Australian sneaker and basketball card stores selling on Benched and see a sample of what each one has listed.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/top-stores' },
  openGraph: pageOpenGraph({ title, description, path: '/top-stores' }),
};

export default function TopStoresLayout({ children }: { children: React.ReactNode }) {
  return children;
}
