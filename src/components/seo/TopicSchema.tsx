import { SEOTopic } from '@/config/seo-topics';
import { SITE_URL } from '@/config/brand';
import type { Product } from '@/lib/types';
import { getProductUrl } from '@/lib/utils/url';

interface Props {
    topic: SEOTopic;
    urlPath: string; // e.g. '/shoes/jordan-1-retro-high'
    /** Live listings shown on the page; listed in the ItemList. */
    listings?: Product[];
}

export default function TopicSchema({ topic, urlPath, listings = [] }: Props) {
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: topic.title,
        description: topic.description,
        url: `${SITE_URL}${urlPath}`,
        about: {
            '@type': 'Thing',
            name: topic.searchQuery,
        },
        mainEntity: {
            '@type': 'ItemList',
            numberOfItems: listings.length,
            itemListElement: listings.map((p, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `${SITE_URL}${getProductUrl({ id: p.id, title: p.title, category: p.category })}`,
                name: p.title,
            })),
        },
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
        />
    );
}
