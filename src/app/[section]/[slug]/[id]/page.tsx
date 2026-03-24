import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getProductById, getReviewsForProduct } from '@/lib/firebase/firestore';
import type { Metadata } from 'next';
import { Loader2 } from 'lucide-react';
import ProductDetailsModern from '@/components/products/ProductDetailsModern';
import ProductSchema from '@/components/seo/ProductSchema';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

import { slugify } from '@/lib/utils';

interface Props {
  params: Promise<{ section: string; slug: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, section, slug } = await params;
  const product = await getProductById(id);
  if (!product) return { title: 'Product Not Found | Benched' };

  const description = product.description?.substring(0, 160) || `Buy ${product.title} on Benched.`;
  const canonicalUrl = `https://benched.au/${section}/${slug}/${id}`;
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
    height: 1200,
    alt: `${product.title} - ${product.category} on Benched.au`,
    type: 'image/jpeg',
  };

  return {
    title: `${product.title} | ${product.category}`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: product.title,
      description,
      url: canonicalUrl,
      type: 'article',
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.title,
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

  const initialReviews = await getReviewsForProduct(id);

  // Fetch SSR related products for SEO Link Juice
  const { getSimilarProductsByCategory } = await import('@/app/actions/products');
  const similarProducts = await getSimilarProductsByCategory(id, product.category, 6);

  return (
    <>
      <ProductSchema product={product} reviews={initialReviews} />
      <BreadcrumbSchema
        items={[
          { name: 'Home', item: '/' },
          { name: product.category, item: product.category === 'Collector Cards' ? '/cards' : `/browse?category=${encodeURIComponent(product.category)}` },
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
