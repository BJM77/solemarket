import { brandConfig, SITE_NAME, SITE_URL } from '@/config/brand';

export function StructuredData() {
  const siteUrl = (SITE_URL || 'https://benched.au').replace(/\/$/, '');
  const abs = (u?: string) => (!u ? undefined : /^https?:\/\//.test(u) ? u : `${siteUrl}${u.startsWith('/') ? '' : '/'}${u}`);
  const sameAs = [brandConfig.seo.facebookUrl, brandConfig.seo.instagramUrl, brandConfig.seo.tiktokUrl].filter(Boolean) as string[];
  const phone = brandConfig.contact.phone || undefined;
  
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify([
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            '@id': `${siteUrl}/#organization`,
            name: SITE_NAME,
            description: brandConfig.company.description,
            url: siteUrl,
            logo: {
              '@type': 'ImageObject',
              url: `${siteUrl}${brandConfig.branding.logoUrl}`,
              width: '512',
              height: '512'
            },
            ...(sameAs.length ? { sameAs } : {}),
            areaServed: {
              '@type': 'Country',
              name: brandConfig.contact.address.country
            },
            address: {
              '@type': 'PostalAddress',
              addressLocality: brandConfig.contact.address.city,
              addressRegion: brandConfig.contact.address.state,
              postalCode: brandConfig.contact.address.postcode,
              addressCountry: brandConfig.contact.address.country,
              ...(brandConfig.contact.address.street && { streetAddress: brandConfig.contact.address.street })
            },
            contactPoint: {
              '@type': 'ContactPoint',
              ...(phone ? { telephone: phone } : {}),
              contactType: 'customer service',
              email: brandConfig.contact.email,
              areaServed: brandConfig.contact.address.country,
              availableLanguage: ['English']
            }
          },
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            '@id': `${siteUrl}/#website`,
            url: siteUrl,
            name: SITE_NAME,
            description: brandConfig.seo.defaultDescription,
            publisher: {
              '@id': `${siteUrl}/#organization`
            },
            potentialAction: {
              '@type': 'SearchAction',
              target: {
                '@type': 'EntryPoint',
                urlTemplate: `${siteUrl}/browse?q={search_term_string}`
              },
              'query-input': 'required name=search_term_string'
            }
          },
          {
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            '@id': `${siteUrl}/#localbusiness`,
            name: SITE_NAME,
            image: abs(brandConfig.branding.ogImageUrl),
            url: siteUrl,
            ...(phone ? { telephone: phone } : {}),
            email: brandConfig.contact.email,
            priceRange: '$$',
            address: {
              '@type': 'PostalAddress',
              ...(brandConfig.contact.address.street ? { streetAddress: brandConfig.contact.address.street } : {}),
              addressLocality: brandConfig.contact.address.city,
              addressRegion: brandConfig.contact.address.state,
              postalCode: brandConfig.contact.address.postcode,
              addressCountry: brandConfig.contact.address.country
            },
            ...(brandConfig.contact.coordinates && {
              geo: {
                '@type': 'GeoCoordinates',
                latitude: brandConfig.contact.coordinates.latitude,
                longitude: brandConfig.contact.coordinates.longitude
              }
            }),
            openingHoursSpecification: [
              {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                opens: '09:00',
                closes: '17:00'
              }
            ],
            ...(sameAs.length ? { sameAs } : {})
          }
        ]),
      }}
    />
  );
}
