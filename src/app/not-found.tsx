import type { Metadata } from 'next';
import NotFoundView from '@/components/layout/NotFoundView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <NotFoundView />;
}
