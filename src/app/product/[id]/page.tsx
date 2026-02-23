import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getProductById, getReviewsForProduct } from '@/lib/firebase/firestore';
import type { Metadata } from 'next';
import type { Product, UserProfile, Review } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import ProductDetailsModern from '@/components/products/ProductDetailsModern';
import SEO from '@/components/SEO';
import ProductSchema from '@/components/seo/ProductSchema';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return { title: 'Product Not Found | Benched' };

  const description = product.description?.substring(0, 160) || `Buy ${product.title} on Benched.`;

  return {
    title: `${product.title} | ${product.category} | Benched`,
    description,
    openGraph: {
      title: product.title,
      description,
      images: product.imageUrls.map(url => ({ url })),
    }
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  console.log('ProductPage: Fetching product with ID:', id);
  const product = await getProductById(id);
  console.log('ProductPage: Result:', product ? 'Found' : 'Not Found');
  if (!product) notFound();

  let seller: UserProfile | null = null;
  const initialReviews = await getReviewsForProduct(id);

  // Fetch SSR related products for SEO Link Juice
  const { getSimilarProductsByCategory } = await import('@/app/actions/products');
  const similarProducts = await getSimilarProductsByCategory(id, product.category, 6);

  return (
    <>
      <SEO
        title={product.title}
        description={product.description}
        image={product.imageUrls[0]}
        url={`/product/${product.id}`}
      />
      <ProductSchema product={product} reviews={initialReviews} />
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
        <ProductDetailsModern
          productId={id}
          initialProduct={product}
          initialSeller={seller}
          initialReviews={initialReviews}
          initialRelatedProducts={similarProducts}
        />
      </Suspense>
    </>
  );
}
