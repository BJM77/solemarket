import { Suspense } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import { getProductById, getReviewsForProduct } from '@/lib/firebase/firestore';
import type { Metadata } from 'next';
import { Loader2 } from 'lucide-react';
import ProductDetailsModern from '@/components/products/ProductDetailsModern';
import ProductSchema from '@/components/seo/ProductSchema';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

import { getProductUrl } from "@/lib/utils/url";
import { metaDescription, sectionPathForCategory } from "@/lib/seo/text";

// ISR: product pages are cached for 5 minutes instead of rendered on every
// visit. Price/status stay live because ProductDetailsModern subscribes to the
// listing doc on the client. Unknown ids still call notFound() and return 404.
export const revalidate = 300;
export const dynamicParams = true;
export async function generateStaticParams() {
  return [];
}

interface Props {
  params: Promise<{ section: string; slug: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return { title: 'Product Not Found', robots: { index: false } };

  // Build a rich, collector-friendly SEO title and description with set, year, card number, and grade.
  const specBits = [
    product.year ? String(product.year) : null,
    product.brand || product.manufacturer || null,
    (product as any).set || null,
    product.cardNumber ? `#${String(product.cardNumber).replace(/^#/, '')}` : null,
    product.gradingCompany && product.gradingCompany !== 'Raw'
      ? `${product.gradingCompany} ${product.grade || ''}`.trim()
      : product.condition || null,
  ].filter(Boolean);

  const enrichedTitle = specBits.length > 0
    ? `${product.title} (${specBits.slice(0, 3).join(' ')}) | ${product.category}`
    : `${product.title} | ${product.category}`;

  const fallbackDesc = `Buy ${product.title}${specBits.length ? ` (${specBits.join(', ')})` : ''} on Benched Australia. Verified local sellers, PayID & secure local collection.`;
  const description = metaDescription(product.seoDescription || product.description) || fallbackDesc;
  const canonicalUrl = `https://benched.au${getProductUrl({ id, title: product.title, category: product.category })}`;
  const primaryImage = product.imageUrls[0];
  const siteUrl = 'https://benched.au';
  
  // Facebook's Scraper often rejects direct Firebase Storage URLs due to encoded slashes, 
  // security tokens, or complex query params. By using a top-level ID-based proxy, 
  // we provide a clean, first-party URL that resolves server-side.
  const proxyUrl = `${siteUrl}/og-image/${id}`;

  const ogImage = {
    url: proxyUrl,
    secureUrl: proxyUrl,
    width: 1200,
    height: 630,
    alt: `${product.title} - ${product.category} on Benched.au`,
    type: 'image/png',
  };

  const keywords = [
    product.title,
    product.brand,
    product.manufacturer,
    (product as any).set,
    product.cardNumber ? `#${product.cardNumber}` : undefined,
    product.gradingCompany,
    product.category,
    product.subCategory,
    'Buy in Australia',
    'Benched.au',
  ].filter((k): k is string => Boolean(k));

  return {
    title: enrichedTitle,
    description,
    keywords,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: enrichedTitle,
      description,
      url: canonicalUrl,
      type: 'website',
      images: [ogImage],
    },
    other: {
      'product:price:amount': String(product.price ?? ''),
      'product:price:currency': 'AUD',
      ...(product.condition ? { 'product:condition': /new|mint/i.test(product.condition) ? 'new' : 'used' } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: enrichedTitle,
      description,
      images: [proxyUrl],
    }
  };
}

export default async function ProductPage({ params }: Props) {
  const { id, section, slug } = await params;

  // Prevent dynamic route from capturing admin routes
  if (section === 'admin') notFound();

  const product = await getProductById(id);
  if (!product) notFound();

  // One URL per product: send wrong section/slug variants to the canonical path.
  const canonicalPath = getProductUrl({ id, title: product.title, category: product.category });
  if (canonicalPath !== `/${section}/${slug}/${id}`) permanentRedirect(canonicalPath);

  // Reviews and related products are independent: fetch them in parallel.
  const { getSimilarProductsByCategory } = await import('@/app/actions/marketplace/products');
  const [initialReviews, similarProducts] = await Promise.all([
    getReviewsForProduct(id),
    getSimilarProductsByCategory(id, product.category, 6),
  ]);

  return (
    <>
      <ProductSchema product={product} reviews={initialReviews} />
      <BreadcrumbSchema
        items={[
          { name: 'Home', item: '/' },
          { name: product.category, item: sectionPathForCategory(section) },
          { name: product.title, item: `/${section}/${slug}/${id}` },
        ]}
      />
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
        <ProductDetailsModern
          productId={id}
          initialProduct={product}
          initialSeller={null}
          initialReviews={initialReviews}
          initialRelatedProducts={similarProducts}
        />
      </Suspense>
    </>
  );
}
