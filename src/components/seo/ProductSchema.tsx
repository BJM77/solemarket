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
    // mpn is the manufacturer's part number (e.g. a sneaker style code or card number); never our listing ID.
    ...((product.styleCode || product.cardNumber) && { mpn: String(product.styleCode || product.cardNumber) }),
    ...((product.brand || product.manufacturer) && {
      brand: {
        '@type': 'Brand',
        name: product.brand || product.manufacturer,
      }
    }),
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
