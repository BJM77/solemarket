import type { Metadata } from 'next';

// Signed-in, per-user tool page: nothing for search engines here.
export const metadata: Metadata = {
  title: 'My Collection',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
