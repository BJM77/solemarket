
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getProductById, getReviewsForProduct } from '@/lib/firebase/firestore';
import type { Metadata } from 'next';
import type { Product, UserProfile, Review } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import ProductDetailsClient from './ProductDetailsClient';

interface Props {
  params: Promise<{ id: string }>;
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

  const description = product.description ? product.description.substring(0, 160) : 'Check out this collectible on Picksy.';

  return {
    title: `${product.title} | Picksy`,
    description: description,
    openGraph: {
      title: product.title,
      description: product.condition ? `${product.condition} condition. ${description}` : description,
      images: images.map(url => ({ url })),
      type: 'website',
      siteName: 'Picksy Marketplace',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.title,
      description: description,
      images: images,
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
      const sellerRef = doc(db, 'users', product.sellerId);
      const sellerSnap = await getDoc(sellerRef);
      if (sellerSnap.exists()) {
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


  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.imageUrls,
    description: product.description,
    brand: {
      '@type': 'Brand',
      name: product.manufacturer || 'Picksy Marketplace',
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'AUD',
      price: product.price,
      availability: product.status === 'available' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/product/${product.id}`,
      seller: {
        '@type': 'Organization',
        name: product.sellerName || 'Picksy Seller'
      },
      eligibleRegion: {
        '@type': 'Country',
        name: 'Australia',
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'AU',
        },
      },
      areaServed: {
        '@type': 'Country',
        name: 'Australia',
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
        item: `${process.env.NEXT_PUBLIC_SITE_URL}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: product.category,
        item: `${process.env.NEXT_PUBLIC_SITE_URL}/${product.category.toLowerCase().replace(/\s+/g, '-')}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.title,
        item: `${process.env.NEXT_PUBLIC_SITE_URL}/product/${product.id}`,
      },
    ],
  };

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
        <ProductDetailsClient
          productId={id}
          initialProduct={product}
          initialSeller={seller}
          initialReviews={initialReviews}
        />
      </Suspense>
    </>
  );
}
