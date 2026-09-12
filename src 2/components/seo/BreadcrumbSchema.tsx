import React from 'react';
import { SITE_URL } from '@/config/brand';

interface BreadcrumbItem {
    name: string;
    item: string; // The relative or absolute path (e.g., '/browse', 'https://benched.au/product/123')
}

interface BreadcrumbSchemaProps {
    items: BreadcrumbItem[];
}

export default function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((breadcrumb, index) => {
            // Ensure the URL is absolute
            const url = breadcrumb.item.startsWith('http')
                ? breadcrumb.item
                : `${SITE_URL}${breadcrumb.item.startsWith('/') ? '' : '/'}${breadcrumb.item}`;

            return {
                '@type': 'ListItem',
                position: index + 1,
                name: breadcrumb.name,
                item: url,
            };
        }),
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}
