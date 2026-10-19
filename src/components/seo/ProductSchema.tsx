import type { Product, Review } from '@/lib/types'
import { getProductUrl } from "@/lib/utils/url";
import { schemaItemCondition } from "@/lib/seo/item-condition";

type Props = {
  product: Product
  reviews?: Review[]
  siteUrl?: string
}

export default function ProductSchema({ product, reviews = [], siteUrl = 'https://benched.au' }: Props) {
  const ratingValue = reviews.length > 0 
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
    : 5;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.imageUrls,
    description: product.description,
    sku: product.id,
    // mpn is the manufacturer's part number (e.g. a sneaker style code); never our listing ID.
    ...(product.styleCode && { mpn: product.styleCode }),
    ...((product.brand || product.manufacturer) && {
      brand: {
        '@type': 'Brand',
        name: product.brand || product.manufacturer,
      }
    }),
    ...(reviews.length > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: ratingValue.toFixed(1),
        reviewCount: reviews.length,
      }
    }),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'AUD',
      price: product.price,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      ...(schemaItemCondition(product.condition) && { itemCondition: schemaItemCondition(product.condition) }),
      availability: (product.status === 'available' || product.status === 'on_hold') ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${siteUrl}${getProductUrl(product)}`,
      seller: {
        '@type': 'Organization',
        name: 'Benched Australia',
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
