import type { Metadata } from 'next';
import { pageOpenGraph } from '@/lib/seo/og';

const title = 'Market Research – Recent Sold Prices';
const description = 'Search recently sold listings to check what basketball cards and sneakers are actually selling for before you buy or list.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/research' },
  openGraph: pageOpenGraph({ title, description, path: '/research' }),
};

export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
