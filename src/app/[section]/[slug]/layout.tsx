import { notFound } from 'next/navigation';

// App areas that are not product categories. Without this guard, unknown paths such as
// /profile/settings render the category grid ("No Products Found") with a 200 status.
const RESERVED = new Set(['profile', 'sell', 'admin', 'dashboard', 'settings', 'account', 'api', 'auth', 'search', 'cart', 'checkout', 'messages', 'orders']);

export default async function SectionSlugLayout({ children, params }: { children: React.ReactNode; params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (RESERVED.has(section)) notFound();
  return children;
}
