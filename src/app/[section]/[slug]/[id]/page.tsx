import { Suspense } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import { getProductById } from '@/lib/firebase/firestore';
import type { Metadata } from 'next';
import ProductDetailsModern from '@/components/products/ProductDetailsModern';
import ProductSchema from '@/components/seo/ProductSchema';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

import { getProductUrl } from "@/lib/utils/url";
import { sectionPathForCategory } from "@/lib/seo/text";
import { listingSeoState } from "@/lib/seo/listing-status";
import { isPokemonListing } from "@/lib/pokemon-listings";
import { listingSeoTitle, listingSeoDescription, schemaSeller } from "@/lib/seo/listing-seo";
import { getPublicSellerInfo } from "@/app/actions/seller/public-seller";
import ScrollListingToTop from "@/components/navigation/scroll-listing-to-top";
import { ListingDetailsFallback } from "@/components/products/ListingDetailsFallback";

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

  const sellerInfo = product.sellerId
    ? await getPublicSellerInfo(product.sellerId).catch(() => null)
    : null;

  // The seller's title plus only details it doesn't already say; the layout adds " | Benched".
  const enrichedTitle = listingSeoTitle(product);
  const description = listingSeoDescription(product, sellerInfo as Record<string, any> | null);
  const canonicalUrl = `https://benched.au${getProductUrl({
    id,
    title: product.title,
    category: product.category,
    subCategory: product.subCategory,
    storefrontId: (product as any).storefrontId,
    brand: product.brand,
    size: product.size,
  })}`;
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
    // Sold/draft pages stay reachable for buyers and links but drop out of search.
    ...((!listingSeoState(product.status).indexable || (product as any).isDraft === true) && { robots: { index: false, follow: true } }),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: enrichedTitle,
      description,
      url: canonicalUrl,
      // og:type "product" is rendered by the page (Next's openGraph.type has no product value).
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

  // Soft-deleted or permanently removed listings redirect to the relevant category hub
  // instead of serving a dead 404 or broken page.
  if (product.status === 'deleted' || (product as any).status === 'removed') {
    permanentRedirect(
      isPokemonListing(product)
        ? '/pokemon'
        : sectionPathForCategory(section),
    );
  }

  // One URL per product: send wrong section/slug variants to the canonical path.
  const canonicalPath = getProductUrl({
    id,
    title: product.title,
    category: product.category,
    subCategory: product.subCategory,
    storefrontId: (product as any).storefrontId,
    brand: product.brand,
    size: product.size,
  });
  // The title-only slug (what search rows and older links produce) renders directly instead of
  // costing an extra redirect; the page's rel=canonical still points at canonicalPath.
  const titleOnlyPath = getProductUrl({
    id,
    title: product.title,
    category: product.category,
    subCategory: product.subCategory,
    storefrontId: (product as any).storefrontId,
  });
  const requestedPath = `/${section}/${slug}/${id}`;
  if (requestedPath !== canonicalPath && requestedPath !== titleOnlyPath) permanentRedirect(canonicalPath);

  const { getSimilarProductsByCategory } = await import('@/app/actions/marketplace/products');
  const [similarProducts, sellerInfo] = await Promise.all([
    getSimilarProductsByCategory(id, product.category, 6),
    product.sellerId ? getPublicSellerInfo(product.sellerId).catch(() => null) : Promise.resolve(null),
  ]);

  return (
    <>
      <ScrollListingToTop />
      <meta property="og:type" content="product" />
      <ProductSchema
        product={product}
        seller={schemaSeller(sellerInfo as Record<string, any> | null, 'https://benched.au', product.sellerId)}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', item: '/' },
          isPokemonListing(product)
            ? { name: 'Pokémon & trading cards', item: '/pokemon' }
            : { name: product.category, item: sectionPathForCategory(section) },
          { name: product.title, item: `/${section}/${slug}/${id}` },
        ]}
      />
      <Suspense fallback={<ListingDetailsFallback product={product} />}>
        <ProductDetailsModern
          productId={id}
          initialProduct={product}
          initialSeller={sellerInfo as any}
          initialRelatedProducts={similarProducts}
        />
      </Suspense>
    </>
  );
}
