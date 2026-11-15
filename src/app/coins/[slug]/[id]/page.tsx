import { Suspense } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Loader2 } from 'lucide-react';
import { getProductById, getReviewsForProduct } from '@/lib/firebase/firestore';
import ProductDetailsModern from '@/components/products/ProductDetailsModern';
import ProductSchema from '@/components/seo/ProductSchema';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { getProductUrl } from '@/lib/utils/url';
import { metaDescription } from '@/lib/seo/text';
import { listingSeoState } from '@/lib/seo/listing-status';
import { listingSeoTitle, schemaSeller } from '@/lib/seo/listing-seo';
import { getPublicSellerInfo } from '@/app/actions/seller/public-seller';
import { isBullionListing, isCoinListing } from '@/lib/coin-listings';
import { coinsPublicUrl } from '@/lib/storefront-routing';
import { STOREFRONTS } from '@/config/storefronts';

/**
 * Coin and bullion listing page: /coins/{slug}/{id} (coins.benched.au/{slug}/{id}).
 * A basketball/sneaker/TCG listing requested here is sent to its own page on
 * the main site, so neither storefront ever shows the other's listings.
 */
export const revalidate = 300;
export const dynamicParams = true;
export async function generateStaticParams() {
  return [];
}

interface Props {
  params: Promise<{ slug: string; id: string }>;
}

/** Where a listing that isn't a coin goes (relative path; on coins.benched.au middleware sends /cards, /shoes to benched.au). */
function mainSitePath(product: { id: string; title: string; category?: string }): string {
  // getProductUrl only returns /coins/... for coin listings, which never reach here.
  return getProductUrl({ id: product.id, title: product.title, category: product.category });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product || !isCoinListing(product)) return { title: 'Listing not found', robots: { index: false } };

  const title = listingSeoTitle(product);
  const specBits = [product.year ? String(product.year) : null, (product as any).denomination || product.model || null, (product as any).metal || null, product.condition || null].filter(Boolean);
  const fallback = `Buy ${product.title}${specBits.length ? ` (${specBits.join(', ')})` : ''} on Benched Coins. Pay the seller directly by PayID or cash on pickup.`;
  const description = metaDescription(product.seoDescription || product.description) || fallback;
  const canonicalUrl = coinsPublicUrl(getProductUrl({ id, title: product.title, category: 'Coins' }));
  const ogImage = `${STOREFRONTS.basketball.origin}/og-image/${id}`;

  return {
    title,
    description,
    ...((!listingSeoState(product.status).indexable || (product as any).isDraft === true) && { robots: { index: false, follow: true } }),
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: STOREFRONTS.coins.name,
      images: [{ url: ogImage, width: 1200, height: 630, alt: product.title }],
    },
    other: {
      'product:price:amount': String(product.price ?? ''),
      'product:price:currency': 'AUD',
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
  };
}

export default async function CoinListingPage({ params }: Props) {
  const { slug, id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  // Not a coin: this listing lives on the basketball site.
  if (!isCoinListing(product)) permanentRedirect(mainSitePath({ id, title: product.title, category: product.category }));

  // One URL per listing (Bullion and Coins both live under /coins).
  const canonicalPath = getProductUrl({ id, title: product.title, category: 'Coins' });
  if (canonicalPath !== `/coins/${slug}/${id}`) permanentRedirect(canonicalPath);

  const { getSimilarProductsByCategory } = await import('@/app/actions/marketplace/products');
  const [initialReviews, similarProducts, sellerInfo] = await Promise.all([
    getReviewsForProduct(id),
    getSimilarProductsByCategory(id, product.category, 6),
    product.sellerId ? getPublicSellerInfo(product.sellerId).catch(() => null) : Promise.resolve(null),
  ]);
  const related = (similarProducts || []).filter((p: any) => isCoinListing(p));

  return (
    <>
      <meta property="og:type" content="product" />
      <ProductSchema
        product={product}
        reviews={initialReviews}
        seller={schemaSeller(sellerInfo as Record<string, any> | null, coinsPublicUrl('/'), product.sellerId)}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Benched Coins', item: coinsPublicUrl('/') },
          isBullionListing(product)
            ? { name: 'Bullion', item: coinsPublicUrl('/browse?coinType=bullion') }
            : { name: 'Coins', item: coinsPublicUrl('/browse') },
          { name: product.title, item: coinsPublicUrl(canonicalPath) },
        ]}
      />
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-amber-600" /></div>}>
        <ProductDetailsModern
          productId={id}
          initialProduct={product}
          initialSeller={null}
          initialReviews={initialReviews}
          initialRelatedProducts={related}
        />
      </Suspense>
    </>
  );
}
