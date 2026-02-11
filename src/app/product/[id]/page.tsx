
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getProductById, getReviewsForProduct } from '@/lib/firebase/firestore';
import type { Metadata } from 'next';
import type { Product, UserProfile, Review } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import ProductDetailsModern from '@/components/products/ProductDetailsModern';


interface Props {
  params: Promise<{ id: string }>;
}

function getConditionSchema(condition?: string) {
  const map: Record<string, string> = {
    'Mint': 'NewCondition',
    'Near Mint': 'LikeNewCondition',
    'Excellent': 'VeryGoodCondition',
    'Good': 'GoodCondition',
    'Fair': 'UsedCondition',
    'Poor': 'DamagedCondition',
  };
  return map[condition || ''] || 'UsedCondition';
}

// Generate dynamic metadata for SEO - This MUST be in a Server Component
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    return {
      title: 'Product Not Found | Picksy',
    };
  }

  const images = product.imageUrls && product.imageUrls.length > 0
    ? product.imageUrls
    : ['/og-image.jpg'];

  const description = product.description
    ? product.description.substring(0, 160)
    : `Buy ${product.title} on Picksy. ${product.condition ? `Condition: ${product.condition}.` : ''} Trusted Australian marketplace for collectors.`;

  const keywords = [
    product.category,
    product.title,
    product.manufacturer,
    product.condition,
    'Picksy',
    'Australia',
    'buy collectibles'
  ].filter(Boolean) as string[];

  return {
    title: `${product.title} | ${product.category} | Picksy`,
    description: description,
    keywords: keywords,
    openGraph: {
      title: product.title,
      description: description,
      images: images.map(url => ({ url })),
      type: 'website',
      siteName: 'Picksy Marketplace',
      url: `/product/${product.id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: product.title,
      description: description,
      images: images,
      creator: '@picksyau',
    },
    alternates: {
      canonical: `/product/${product.id}`,
    },
    other: {
      'product:price:amount': product.price?.toString() || '0',
      'product:price:currency': 'AUD',
      'product:availability': product.status === 'available' ? 'instock' : 'oos',
      'product:condition': product.condition?.toLowerCase() || 'used',
    }
  };
}


// This is the main page component - it's a Server Component
export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  // Fetch seller and reviews on the server
  let seller: UserProfile | null = null;
  if (product.sellerId) {
    try {
      const { firestoreDb } = await import('@/lib/firebase/admin');
      const sellerSnap = await firestoreDb.collection('users').doc(product.sellerId).get();
      if (sellerSnap.exists) {
        const sellerData = sellerSnap.data();
        // Serialize timestamps to plain objects
        const serializedSeller: any = { id: sellerSnap.id };
        for (const key in sellerData) {
          const value = sellerData[key];
          if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) {
            serializedSeller[key] = { seconds: value.seconds, nanoseconds: value.nanoseconds };
          } else {
            serializedSeller[key] = value;
          }
        }
        seller = serializedSeller as UserProfile;
      }
    } catch (e) {
      console.error("Failed to fetch seller profile:", e);
    }
  }

  const initialReviews = await getReviewsForProduct(id);


  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://studio-8322868971-8ca89.web.app';

  const jsonLd: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.imageUrls.map((url, index) => ({
      '@type': 'ImageObject',
      url: url,
      caption: (product as any).imageAltTexts?.[index] || product.title
    })),
    description: product.description,
    brand: {
      '@type': 'Brand',
      name: product.manufacturer || 'Picksy Marketplace',
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'AUD',
      price: product.price,
      priceValidUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().split('T')[0], // 30 days from now
      availability: product.status === 'available' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
      itemCondition: `https://schema.org/${getConditionSchema(product.condition)}`,
      url: `${SITE_URL}/product/${product.id}`,
      seller: {
        '@type': 'Organization',
        name: product.sellerName || 'Picksy Seller'
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'AU',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnPeriod',
        merchantReturnDays: 7,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/RestockingFee'
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'AU',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 3,
            unitCode: 'd'
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 2,
            maxValue: 5,
            unitCode: 'd'
          }
        },
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: product.price > 100 ? 0 : 15, // Free shipping over $100
          currency: 'AUD'
        }
      },
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${SITE_URL}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: product.category,
        item: `${SITE_URL}/${product.category.toLowerCase().replace(/\s+/g, '-')}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.title,
        item: `${SITE_URL}/product/${product.id}`,
      },
    ],
  };

  // Fetch adjacent products (gracefully handle missing index)
  const { getAdjacentProducts } = await import('@/app/actions/products');
  let adjacentProducts: { prevId: string | null; nextId: string | null } = { prevId: null, nextId: null };
  try {
    adjacentProducts = await getAdjacentProducts(id, product.createdAt);
  } catch (error) {
    console.warn('Adjacent products unavailable (index may not exist yet):', error);
  }

  // The client component handles all interactive logic
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
        <ProductDetailsModern
          productId={id}
          initialProduct={product}
          initialSeller={seller}
          initialReviews={initialReviews}
          adjacentProducts={adjacentProducts}
        />
      </Suspense>
    </>
  );
}
