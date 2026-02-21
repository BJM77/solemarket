import { SEOTopic } from '@/config/seo-topics';
import { SITE_URL } from '@/config/brand';

interface Props {
    topic: SEOTopic;
    urlPath: string; // e.g. '/shoes/jordan-1-retro-high'
}

export default function TopicSchema({ topic, urlPath }: Props) {
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
            itemListElement: [
                {
                    '@type': 'ListItem',
                    position: 1,
                    name: `All ${topic.searchQuery} in Australia`
                }
            ]
        }
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}
