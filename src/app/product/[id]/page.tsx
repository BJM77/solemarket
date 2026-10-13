import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getProductById } from '@/lib/firebase/firestore';
import { getProductUrl } from '@/lib/utils/url';

/**
 * Legacy alias. Every product has one canonical URL (/{section}/{slug}/{id});
 * /product/{id} permanently redirects there so search engines see a single URL.
 */
export const revalidate = 300;
export const dynamicParams = true;
export async function generateStaticParams() {
  return [];
}

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function ProductAliasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();
  permanentRedirect(getProductUrl({ id, title: product.title, category: product.category }));
}
