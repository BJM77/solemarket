import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { generateInvestmentProfile } from '@/app/actions/encyclopedia';
import { firestoreDb } from '@/lib/firebase/admin';
import type { Product } from '@/lib/types';
import ProductCard from '@/components/products/ProductCard';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Info, AlertTriangle, Star } from 'lucide-react';
import type { Metadata } from 'next';

interface Props {
    params: Promise<{ category: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { category, slug } = await params;
    const subject = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const profile = await generateInvestmentProfile(category, subject);

    if (!profile) return { title: `${subject} Guide | Picksy` };

    return {
        title: profile.title,
        description: profile.seoMetaDescription,
    };
}

export default async function GuidePage({ params }: Props) {
    const { category, slug } = await params;
    const subject = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    const profile = await generateInvestmentProfile(category, subject);

    if (!profile) {
        notFound();
    }

    // Fetch live inventory related to this subject
    // We'll search by title or keywords
    const productsSnap = await firestoreDb.collection('products')
        .where('category', '==', category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' '))
        .limit(12)
        .get();

    const products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];

    // Filter client-side for subject because Firestore doesn't support substring match well without indexing
    const filteredProducts = products.filter(p =>
        p.title.toLowerCase().includes(subject.toLowerCase()) ||
        p.description.toLowerCase().includes(subject.toLowerCase())
    ).slice(0, 8);

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-background-dark/50 pb-20">
            {/* Hero Section */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 text-center">
                    <Badge variant="outline" className="mb-4 text-primary border-primary/20 bg-primary/5 px-4 py-1 font-bold uppercase tracking-widest text-[10px]">
                        {category.toUpperCase()} INVESTMENT GUIDE
                    </Badge>
                    <h1 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tight mb-6">
                        {profile.title}
                    </h1>
                    <p className="max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-400">
                        Expert analysis on rarity, market trends, and long-term value for {subject} collectors.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Main Content: AI Encyclopedia */}
                <div className="lg:col-span-8 space-y-12">
                    {/* Investment Outlook */}
                    <section className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <TrendingUp className="h-6 w-6 text-primary" />
                            <h2 className="text-2xl font-bold">Investment Outlook</h2>
                        </div>
                        <div className="prose prose-gray dark:prose-invert max-w-none">
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">
                                {profile.investmentOutlook}
                            </p>
                        </div>
                    </section>

                    {/* Rarity Analysis */}
                    <section className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <Star className="h-6 w-6 text-yellow-500 fill-yellow-500/20" />
                            <h2 className="text-2xl font-bold">Rarity & Scarcity</h2>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                            {profile.rarityAnalysis}
                        </p>
                    </section>

                    {/* Key Attributes */}
                    <section>
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Info className="h-5 w-5 text-blue-500" />
                            What to Look For
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {profile.topKeyAttributes.map((attr, i) => (
                                <div key={i} className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{attr}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Inventory Section */}
                    <section className="pt-12 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold">Live Listings</h2>
                            <Badge className="bg-green-500/10 text-green-600 border-0">{filteredProducts.length} Items Available</Badge>
                        </div>

                        {filteredProducts.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {filteredProducts.map(product => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 text-center bg-gray-100/50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                                <AlertTriangle className="h-10 w-10 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-500">No active listings match this specific subject right now.</p>
                            </div>
                        )}
                    </section>
                </div>

                {/* Sidebar: Market Data / Quick Links */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="sticky top-24 space-y-6">
                        <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10">
                            <h3 className="font-bold text-lg mb-4">Start Selling</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                Have a {subject} item? List it on Picksy and reach thousands of collectors.
                            </p>
                            <button className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors">
                                List Your Item
                            </button>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700">
                            <h3 className="font-bold text-lg mb-4">Market Snapshot</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 uppercase tracking-wider font-bold text-[10px]">Avg Price</span>
                                    <span className="font-bold text-primary">$450.00</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 uppercase tracking-wider font-bold text-[10px]">Demand</span>
                                    <span className="text-green-600 font-bold uppercase tracking-wider text-[10px]">High</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
