import type { Product } from '@/lib/types'
import { getProductUrl } from "@/lib/utils/url";
import { listingSeoState } from '@/lib/seo/listing-status';
import { schemaItemCondition } from "@/lib/seo/item-condition";
import { schemaBrand, type SchemaSeller } from '@/lib/seo/listing-seo';

type Props = {
  product: Product
  siteUrl?: string
  /** The actual seller (store or person); the offer omits seller when unknown. */
  seller?: SchemaSeller | null
}

export default function ProductSchema({ product, siteUrl = 'https://benched.au', seller = null }: Props) {
  const brand = schemaBrand(product);

  const colorVal = product.colorway || product.color;
  const sizeVal = product.size;

  const additionalProperty = [
    product.year ? { '@type': 'PropertyValue', name: 'Year', value: String(product.year) } : null,
    (product as any).set ? { '@type': 'PropertyValue', name: 'Set', value: String((product as any).set) } : null,
    product.cardNumber ? { '@type': 'PropertyValue', name: 'Card Number', value: String(product.cardNumber) } : null,
    product.gradingCompany ? { '@type': 'PropertyValue', name: 'Grading Company', value: String(product.gradingCompany) } : null,
    product.grade ? { '@type': 'PropertyValue', name: 'Grade', value: String(product.grade) } : null,
    product.condition ? { '@type': 'PropertyValue', name: 'Condition', value: String(product.condition) } : null,
    product.model ? { '@type': 'PropertyValue', name: 'Model', value: String(product.model) } : null,
    sizeVal ? { '@type': 'PropertyValue', name: 'Size (US)', value: String(sizeVal) } : null,
    colorVal ? { '@type': 'PropertyValue', name: 'Colorway', value: String(colorVal) } : null,
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
    ...(product.model && { model: String(product.model) }),
    ...(sizeVal && { size: String(sizeVal) }),
    ...(colorVal && { color: String(colorVal) }),
    ...(brand && { brand: { '@type': 'Brand', name: brand } }),
    ...(additionalProperty.length > 0 && { additionalProperty }),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'AUD',
      price: product.price,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      ...(schemaItemCondition(product.condition) && { itemCondition: schemaItemCondition(product.condition) }),
      availability: listingSeoState(product.status).availability,
      url: `${siteUrl}${getProductUrl(product)}`,
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: typeof (product as any).shippingCost === 'number' ? (product as any).shippingCost : 15,
          currency: 'AUD',
        },
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
            unitCode: 'DAY',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 2,
            maxValue: 6,
            unitCode: 'DAY',
          },
        },
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'AU',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 14,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
      },
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
