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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://benched.au';
  
  // Facebook notoriously drops complex Firebase Storage URLs with tokens. 
  // We proxy the image through Next.js Image Optimization to provide a clean, absolute Benched.au URL.
  const optimizedOgImage = primaryImage 
    ? `${siteUrl}/_next/image?url=${encodeURIComponent(primaryImage)}&w=1200&q=75`
    : `${siteUrl}/benchedlogo.png`;

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
      images: [optimizedOgImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.title,
      description,
      images: [optimizedOgImage],
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
