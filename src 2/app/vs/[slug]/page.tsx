import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getComparisonBySlug, TOP_COMPARISONS } from '@/config/comparisons';
import { SITE_URL } from '@/config/brand';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Scale, CheckCircle2, TrendingUp, ShieldCheck } from 'lucide-react';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const comparison = getComparisonBySlug(slug);

    if (!comparison) {
        return { title: 'Comparison Not Found | Benched' };
    }

    const title = `${comparison.itemA.name} vs ${comparison.itemB.name}: Which is Better? | Benched`;
    const description = `Read our expert head-to-head comparison between ${comparison.itemA.name} and ${comparison.itemB.name}. Analysis of performance, market value, and collectibility.`;

    return {
        title,
        description,
        alternates: {
            canonical: `/vs/${slug}`,
        }
    };
}

export async function generateStaticParams() {
    return TOP_COMPARISONS.map((c) => ({
        slug: c.slug,
    }));
}

export default async function ComparisonPage({ params }: Props) {
    const { slug } = await params;
    const comparison = getComparisonBySlug(slug);

    if (!comparison) {
        notFound();
    }

    const allSpecs = Array.from(new Set([
        ...Object.keys(comparison.itemA.specs),
        ...Object.keys(comparison.itemB.specs)
    ]));

    return (
        <>
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Comparisons', item: '/vs' },
                    { name: `${comparison.itemA.name} vs ${comparison.itemB.name}`, item: `/vs/${slug}` },
                ]}
            />
            
            <div className="min-h-screen bg-slate-50 pb-20">
                {/* Header */}
                <div className="bg-white border-b border-slate-200">
                    <div className="max-w-6xl mx-auto px-4 py-8 md:py-16 text-center">
                        <Link href="/vs" className="inline-flex items-center text-sm font-bold text-primary hover:text-primary/80 transition-colors mb-8">
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            All Comparisons
                        </Link>

                        <div className="flex items-center justify-center gap-2 mb-6">
                            <Scale className="w-8 h-8 text-primary" />
                            <span className="bg-primary/10 text-primary px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                                Expert Comparison
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-8 leading-tight text-slate-900">
                            {comparison.itemA.name} <span className="text-primary italic">vs</span> {comparison.itemB.name}
                        </h1>
                        
                        <p className="max-w-2xl mx-auto text-lg text-slate-500 font-medium">
                            A deep-dive head-to-head analysis of two basketball {comparison.category === 'Sneakers' ? 'powerhouses' : 'classics'}. 
                            Which one belongs in your rotation?
                        </p>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto px-4 -mt-10">
                    {/* Visual Comparison */}
                    <div className="grid md:grid-cols-2 gap-8 mb-16">
                        {[comparison.itemA, comparison.itemB].map((item, idx) => (
                            <div key={idx} className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 overflow-hidden group">
                                <div className="relative aspect-square rounded-2xl overflow-hidden mb-6 bg-slate-100">
                                    <Image
                                        src={item.image}
                                        alt={item.name}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute top-4 left-4">
                                        <span className="bg-black text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">
                                            {item.brand}
                                        </span>
                                    </div>
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 mb-2">{item.name}</h3>
                                <Link 
                                    href={`/browse?q=${encodeURIComponent(item.name)}`}
                                    className="inline-flex items-center text-sm font-bold text-primary hover:underline"
                                >
                                    Shop on Benched →
                                </Link>
                            </div>
                        ))}
                    </div>

                    {/* Spec Table */}
                    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden mb-16">
                        <div className="p-8 border-b border-slate-100">
                            <h2 className="text-2xl font-black text-slate-900">Tale of the Tape</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50">
                                        <th className="p-6 text-sm font-black text-slate-400 uppercase tracking-widest w-1/3">Feature</th>
                                        <th className="p-6 text-sm font-black text-slate-900 uppercase tracking-widest">{comparison.itemA.name}</th>
                                        <th className="p-6 text-sm font-black text-slate-900 uppercase tracking-widest">{comparison.itemB.name}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {allSpecs.map((spec) => (
                                        <tr key={spec} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-6 font-bold text-slate-600">{spec}</td>
                                            <td className="p-6 text-slate-900">{comparison.itemA.specs[spec] || '—'}</td>
                                            <td className="p-6 text-slate-900">{comparison.itemB.specs[spec] || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Verdict */}
                    <div className="bg-indigo-900 rounded-[3rem] p-8 md:p-16 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-32 -mt-32" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-8">
                                <TrendingUp className="w-8 h-8 text-primary" />
                                <h2 className="text-3xl md:text-4xl font-black tracking-tight">The Benched Verdict</h2>
                            </div>
                            <p className="text-xl md:text-2xl leading-relaxed font-medium mb-12 text-indigo-100">
                                "{comparison.verdict}"
                            </p>
                            
                            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                                <div className="flex items-center gap-3 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                                    <ShieldCheck className="w-6 h-6 text-primary" />
                                    <span className="text-sm font-bold">DealSafe Protected</span>
                                </div>
                                <div className="flex items-center gap-3 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                                    <CheckCircle2 className="w-6 h-6 text-primary" />
                                    <span className="text-sm font-bold">AI Verified Data</span>
                                </div>
                                <Link 
                                    href="/sell"
                                    className="flex items-center justify-center gap-3 bg-primary p-4 rounded-2xl shadow-lg hover:bg-primary/90 transition-all font-black text-sm"
                                >
                                    Sell Yours Now
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
