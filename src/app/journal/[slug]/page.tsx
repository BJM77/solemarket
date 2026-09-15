import React from 'react';
import { notFound } from 'next/navigation';
import { getArticleBySlug, JOURNAL_ARTICLES } from '@/config/journal';
import { ArticleSchema } from '@/components/seo/ArticleSchema';
import ReactMarkdown from 'react-markdown';
import type { Metadata, ResolvingMetadata } from 'next';
import { brandConfig } from '@/config/brand';

interface Props {
    params: { slug: string };
}

export async function generateStaticParams() {
    return JOURNAL_ARTICLES.map((article) => ({
        slug: article.slug,
    }));
}

export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const article = getArticleBySlug(params.slug);
    if (!article) return { title: 'Article Not Found' };

    return {
        title: `${article.title} | Benched Journal`,
        description: article.excerpt,
        openGraph: {
            title: article.title,
            description: article.excerpt,
            images: [article.coverImage],
            type: 'article',
            publishedTime: article.datePublished,
            authors: [article.authorName],
        },
    };
}

export default function JournalArticlePage({ params }: Props) {
    const article = getArticleBySlug(params.slug);
    
    if (!article) {
        notFound();
    }

    return (
        <article className="bg-black min-h-screen pb-20">
            <ArticleSchema 
                title={article.title}
                description={article.excerpt}
                image={article.coverImage}
                url={`https://benched.au/journal/${article.slug}`}
                datePublished={article.datePublished}
                dateModified={article.dateModified}
                authorName={article.authorName}
            />

            {/* Hero Image */}
            <div className="relative w-full h-[400px] md:h-[500px]">
                <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${article.coverImage})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/20" />
                
                <div className="absolute bottom-0 left-0 w-full p-6 md:p-12">
                    <div className="max-w-4xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-500 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
                            {article.category}
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-tight mb-6">
                            {article.title}
                        </h1>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground border-t border-white/10 pt-6">
                            <span className="font-bold text-white">{article.authorName}</span>
                            <span>•</span>
                            <span>{new Date(article.datePublished).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{article.readingTime}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-3xl mx-auto px-4 pt-12">
                <div className="prose prose-invert prose-emerald max-w-none prose-headings:font-black prose-headings:uppercase prose-h2:text-3xl prose-h3:text-2xl prose-p:text-lg prose-p:leading-relaxed prose-a:text-emerald-500">
                    <ReactMarkdown>{article.content}</ReactMarkdown>
                </div>
                
                <div className="mt-16 pt-8 border-t border-white/10 text-center">
                    <p className="text-muted-foreground mb-4">Did you find this guide helpful?</p>
                    <div className="flex justify-center gap-4">
                        {/* Future share buttons */}
                    </div>
                </div>
            </div>
        </article>
    );
}
