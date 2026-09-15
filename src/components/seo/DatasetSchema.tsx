import React from 'react';

interface DatasetSchemaProps {
    name: string;
    description: string;
    url: string;
    dateModified: string;
    keywords: string[];
    creatorName?: string;
}

export function DatasetSchema({
    name,
    description,
    url,
    dateModified,
    keywords,
    creatorName = "Benched AU"
}: DatasetSchemaProps) {
    const jsonLd = {
        "@context": "https://schema.org/",
        "@type": "Dataset",
        "name": name,
        "description": description,
        "url": url,
        "sameAs": url,
        "keywords": keywords,
        "creator": {
            "@type": "Organization",
            "name": creatorName
        },
        "dateModified": dateModified,
        "isAccessibleForFree": true,
        "license": "https://creativecommons.org/publicdomain/zero/1.0/"
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}
