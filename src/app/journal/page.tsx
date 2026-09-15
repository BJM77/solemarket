import React from 'react';
import Link from 'next/link';
import { JOURNAL_ARTICLES } from '@/config/journal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { brandConfig } from '@/config/brand';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: `Benched Journal | ${brandConfig.seo.defaultTitle}`,
    description: 'Expert authentication guides, market reports, and collector spotlights from the Benched AU editorial team.',
};

export const revalidate = 3600;

export default function JournalIndexPage() {
    const featuredArticle = JOURNAL_ARTICLES.find(a => a.featured) || JOURNAL_ARTICLES[0];
    const otherArticles = JOURNAL_ARTICLES.filter(a => a.slug !== featuredArticle.slug);

    return (
        <div className="bg-black min-h-screen pt-24 pb-20">
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">
                        The Benched <span className="text-emerald-500">Journal</span>
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                        Authentication deep-dives, market reports, and buying guides built for Australian collectors.
                    </p>
                </div>

                {/* Featured Article */}
                {featuredArticle && (
                    <Link href={`/journal/${featuredArticle.slug}`}>
                        <div className="mb-16 relative rounded-2xl overflow-hidden group cursor-pointer border border-white/10 h-[500px]">
                            <div 
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                                style={{ backgroundImage: `url(${featuredArticle.coverImage})` }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                            
                            <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full md:w-2/3">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500 text-black rounded-full text-xs font-bold uppercase tracking-widest mb-4">
                                    {featuredArticle.category}
                                </div>
                                <h2 className="text-3xl md:text-5xl font-black uppercase text-white mb-4 leading-tight group-hover:underline underline-offset-4">
                                    {featuredArticle.title}
                                </h2>
                                <p className="text-lg text-white/80 line-clamp-2 mb-4">
                                    {featuredArticle.excerpt}
                                </p>
                                <div className="flex items-center gap-4 text-sm text-white/60">
                                    <span>By {featuredArticle.authorName}</span>
                                    <span>•</span>
                                    <span>{featuredArticle.readingTime}</span>
                                </div>
                            </div>
                        </div>
                    </Link>
                )}

                {/* Article Grid */}
                {otherArticles.length > 0 && (
                    <>
                        <h3 className="text-2xl font-bold mb-6 border-b border-white/10 pb-4">Latest Articles</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {otherArticles.map(article => (
                                <Link key={article.slug} href={`/journal/${article.slug}`}>
                                    <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors h-full flex flex-col group cursor-pointer">
                                        <div 
                                            className="h-48 w-full bg-cover bg-center rounded-t-lg"
                                            style={{ backgroundImage: `url(${article.coverImage})` }}
                                        />
                                        <CardHeader>
                                            <div className="text-xs font-bold uppercase tracking-widest text-emerald-500 mb-2">
                                                {article.category}
                                            </div>
                                            <CardTitle className="text-xl group-hover:underline underline-offset-4">
                                                {article.title}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex-1 flex flex-col justify-end">
                                            <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                                                {article.excerpt}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto">
                                                <span>{article.authorName}</span>
                                                <span>•</span>
                                                <span>{new Date(article.datePublished).toLocaleDateString()}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
