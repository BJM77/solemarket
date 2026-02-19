import type { Product, Review } from '@/lib/types'

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
    mpn: product.styleCode || product.id,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'Benched',
    },
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
      availability: product.status === 'available' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${siteUrl}/product/${product.id}`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
