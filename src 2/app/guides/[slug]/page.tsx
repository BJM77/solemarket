import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getGuideBySlug, SEO_GUIDES } from '@/config/guides';
import { SITE_URL } from '@/config/brand';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Clock, User, Calendar } from 'lucide-react';

interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const guide = getGuideBySlug(slug);

    if (!guide) {
        return { title: 'Guide Not Found | Benched' };
    }

    return {
        title: `${guide.title} | Benched Guides`,
        description: guide.excerpt,
        openGraph: {
            title: guide.title,
            description: guide.excerpt,
            type: 'article',
            publishedTime: guide.date,
            authors: [guide.author],
            images: [guide.coverImage],
        },
        alternates: {
            canonical: `/guides/${slug}`,
        }
    };
}

import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

export async function generateStaticParams() {
    return SEO_GUIDES.map((guide) => ({
        slug: guide.slug,
    }));
}

export default async function GuideArticlePage({ params }: Props) {
    const { slug } = await params;
    const guide = getGuideBySlug(slug);

    if (!guide) {
        notFound();
    }

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: guide.title,
        description: guide.excerpt,
        image: guide.coverImage,
        datePublished: guide.date,
        dateModified: guide.date,
        author: {
            '@type': 'Person',
            name: guide.author,
        },
        publisher: {
            '@type': 'Organization',
            name: 'Benched',
            logo: {
                '@type': 'ImageObject',
                url: `${SITE_URL}/logo.png`,
            },
        },
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `${SITE_URL}/guides/${slug}`,
        },
    };

    return (
        <>
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Collector Guides', item: '/guides' },
                    { name: guide.category, item: `/guides` },
                    { name: guide.title, item: `/guides/${slug}` },
                ]}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <div className="min-h-screen bg-background pb-20">
                <div className="bg-card border-b border-border">
                    <div className="max-w-4xl mx-auto px-4 py-8 md:py-16">
                        <Link href="/guides" className="inline-flex items-center text-sm font-bold text-primary hover:text-primary/80 transition-colors mb-8">
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Back to Guides
                        </Link>

                        <span className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-6">
                            {guide.category}
                        </span>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-8 leading-tight text-slate-900 dark:text-white">
                            {guide.title}
                        </h1>

                        <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 font-medium">
                            <div className="flex items-center gap-2">
                                <div className="bg-gray-100 p-2 rounded-full">
                                    <User className="w-4 h-4" />
                                </div>
                                <span>{guide.author}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="bg-gray-100 p-2 rounded-full">
                                    <Calendar className="w-4 h-4" />
                                </div>
                                <span>{new Date(guide.date).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="bg-gray-100 p-2 rounded-full">
                                    <Clock className="w-4 h-4" />
                                </div>
                                <span>{guide.readingTime}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto px-4 mt-8 md:mt-12">
                    <div className="relative aspect-[21/9] w-full max-w-5xl overflow-hidden rounded-3xl shadow-xl mb-12 bg-gray-100 mx-auto">
                        <Image
                            src={guide.coverImage}
                            alt={guide.title}
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>

                    <div className="prose prose-lg md:prose-xl max-w-3xl mx-auto text-foreground leading-relaxed dark:prose-invert prose-headings:font-black prose-headings:tracking-tight prose-a:text-primary hover:prose-a:text-primary/80 prose-img:rounded-2xl prose-img:shadow-xl">
                        <div dangerouslySetInnerHTML={{ __html: guide.content }} />
                    </div>

                    <div className="max-w-3xl mx-auto mt-16 pt-8 border-t border-gray-200">
                        <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-3xl p-8 text-center sm:text-left sm:flex items-center justify-between border border-indigo-100 dark:border-indigo-900/50">
                            <div>
                                <h3 className="text-2xl font-black tracking-tight mb-2 text-indigo-950 dark:text-white">Ready to start buying safely?</h3>
                                <p className="text-indigo-800/70 dark:text-indigo-200/70 font-medium mb-6 sm:mb-0">Find verified items with DealSafe protection.</p>
                            </div>
                            <Link href="/browse" className="inline-flex h-14 items-center justify-center rounded-2xl bg-indigo-600 px-8 text-sm font-bold text-white shadow-lg transition-colors hover:bg-indigo-700 w-full sm:w-auto shrink-0">
                                Explore the Marketplace
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
