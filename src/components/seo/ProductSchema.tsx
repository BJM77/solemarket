import type { Product, Review } from '@/lib/types'
import { getProductUrl } from "@/lib/utils/url";
import { listingSeoState } from '@/lib/seo/listing-status';
import { schemaItemCondition } from "@/lib/seo/item-condition";
import { schemaBrand, type SchemaSeller } from '@/lib/seo/listing-seo';

type Props = {
  product: Product
  reviews?: Review[]
  siteUrl?: string
  /** The actual seller (store or person); the offer omits seller when unknown. */
  seller?: SchemaSeller | null
}

export default function ProductSchema({ product, reviews = [], siteUrl = 'https://benched.au', seller = null }: Props) {
  const brand = schemaBrand(product);
  const ratingValue = reviews.length > 0 
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
    : 5;

  const additionalProperty = [
    product.year ? { '@type': 'PropertyValue', name: 'Year', value: String(product.year) } : null,
    (product as any).set ? { '@type': 'PropertyValue', name: 'Set', value: String((product as any).set) } : null,
    product.cardNumber ? { '@type': 'PropertyValue', name: 'Card Number', value: String(product.cardNumber) } : null,
    product.gradingCompany ? { '@type': 'PropertyValue', name: 'Grading Company', value: String(product.gradingCompany) } : null,
    product.grade ? { '@type': 'PropertyValue', name: 'Grade', value: String(product.grade) } : null,
    product.condition ? { '@type': 'PropertyValue', name: 'Condition', value: String(product.condition) } : null,
  ].filter(Boolean);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.imageUrls,
    description: product.seoDescription || product.description || `${product.title} available on Benched Australia`,
    sku: product.id,
    category: product.category,
    // mpn is the manufacturer's part number (e.g. a sneaker style code); never our listing ID or card number.
    ...(product.styleCode && { mpn: String(product.styleCode) }),
    ...(brand && { brand: { '@type': 'Brand', name: brand } }),
    ...(additionalProperty.length > 0 && { additionalProperty }),
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
      availability: listingSeoState(product.status).availability,
      url: `${siteUrl}${getProductUrl(product)}`,
      // Benched is the marketplace, not the seller. Shipping/returns are set per seller
      // and not stored in a structured way, so shippingDetails/hasMerchantReturnPolicy are omitted.
      ...(seller && { seller }),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
