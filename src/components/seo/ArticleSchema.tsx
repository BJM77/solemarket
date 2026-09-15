import React from 'react';

interface ArticleSchemaProps {
    title: string;
    description: string;
    image: string;
    url: string;
    datePublished: string;
    dateModified: string;
    authorName: string;
    publisherName?: string;
    publisherLogo?: string;
}

export function ArticleSchema({
    title,
    description,
    image,
    url,
    datePublished,
    dateModified,
    authorName,
    publisherName = "Benched AU",
    publisherLogo = "https://benched.au/logo.png"
}: ArticleSchemaProps) {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title,
        "description": description,
        "image": image,
        "datePublished": datePublished,
        "dateModified": dateModified,
        "author": {
            "@type": "Person",
            "name": authorName
        },
        "publisher": {
            "@type": "Organization",
            "name": publisherName,
            "logo": {
                "@type": "ImageObject",
                "url": publisherLogo
            }
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": url
        }
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}
