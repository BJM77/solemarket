
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
      title: 'Product Not Found | Benched',
    };
  }

  const images = product.imageUrls && product.imageUrls.length > 0
    ? product.imageUrls
    : ['/og-image.jpg'];

  const description = product.description
    ? product.description.substring(0, 160)
    : `Buy ${product.title} on Benched. ${product.condition ? `Condition: ${product.condition}.` : ''} Trusted Australian marketplace for collectors.`;

  const keywords = [
    product.category,
    product.title,
    product.manufacturer,
    product.condition,
    'Benched',
    'Australia',
    'buy basketball sneakers'
  ].filter(Boolean) as string[];

  return {
    title: `${product.title} | ${product.category} | Benched`,
    description: description,
    keywords: keywords,
    openGraph: {
      title: product.title,
      description: description,
      images: images.map(url => ({ url })),
      type: 'website',
      siteName: 'Benched Marketplace',
      url: `/product/${product.id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: product.title,
      description: description,
      images: images,
      creator: '@benchedau',
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
  const ratingValue = initialReviews.length > 0 
    ? initialReviews.reduce((acc, r) => acc + r.rating, 0) / initialReviews.length 
    : 5;

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://benched.au';

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
    sku: product.id,
    mpn: product.styleCode || product.cardNumber || product.id,
    brand: {
      '@type': 'Brand',
      name: product.brand || product.manufacturer || 'Benched Marketplace',
    },
    ...(initialReviews.length > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: ratingValue.toFixed(1),
        reviewCount: initialReviews.length,
      },
      review: initialReviews.slice(0, 5).map(r => ({
        '@type': 'Review',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: r.rating,
        },
        author: {
          '@type': 'Person',
          name: r.buyerName,
        },
        reviewBody: r.comment,
        datePublished: r.createdAt?.toDate?.()?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      })),
    }),
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
        name: product.sellerName || 'Benched Seller'
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
  const { getAdjacentProducts, getProductsByCategory } = await import('@/app/actions/products');
  let adjacentProducts: { prevId: string | null; nextId: string | null } = { prevId: null, nextId: null };
  try {
    adjacentProducts = await getAdjacentProducts(id, product.createdAt);
  } catch (error) {
    console.warn('Adjacent products unavailable (index may not exist yet):', error);
  }

  // Fetch similar products for automated internal linking
  let similarProducts: Product[] = [];
  try {
    const { getProducts } = await import('@/services/product-service');
    const result = await getProducts({
      category: product.category,
      limit: 4,
      page: 1,
      sort: 'createdAt-desc'
    });
    similarProducts = result.products.filter(p => p.id !== id);
  } catch (e) {
    console.error("Failed to fetch similar products:", e);
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

      {/* Automated Internal Linking Section */}
      {similarProducts.length > 0 && (
        <section className="container mx-auto px-4 py-16 border-t border-slate-100">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">You might also like</h2>
              <p className="text-muted-foreground mt-2 font-medium">More authentic {product.category.toLowerCase()} curated for you.</p>
            </div>
            <a href={product.category === 'Trading Cards' ? '/cards' : '/browse'} className="text-sm font-bold text-primary hover:underline uppercase tracking-widest">
              View All
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {similarProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
