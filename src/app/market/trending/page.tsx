import { serializeFirestoreDoc } from '@/lib/firebase/serializers';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

export default async function MarketTrendingPage() {
    // Fetch products sorted by views (trending)
    const productsSnap = await firestoreDb.collection('products')
        .where('status', '==', 'available')
        .orderBy('views', 'desc')
        .limit(20)
        .get();

    const trendingProducts = productsSnap.docs.map(doc => serializeFirestoreDoc({
        id: doc.id,
        ...doc.data()
    })) as Product[];

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-background-dark/50 pb-20">
            <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-4 py-16">
                    <div className="flex flex-col items-center text-center">
                        <div className="h-16 w-16 bg-orange-100 dark:bg-orange-950/50 rounded-2xl flex items-center justify-center mb-6">
                            <Flame className="h-8 w-8 text-orange-600" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">
                            Market Trending
                        </h1>
                        <p className="max-w-xl text-lg text-gray-600 dark:text-gray-400">
                            Real-time insights into the most viewed and in-demand collectibles on Picksy right now.
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 mt-12">
                <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
                        <div className="h-10 w-10 bg-blue-100 dark:bg-blue-950/50 rounded-xl flex items-center justify-center text-blue-600">
                            <BarChart3 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Market Velocity</p>
                            <p className="text-xl font-bold">+14% this week</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
                        <div className="h-10 w-10 bg-green-100 dark:bg-green-950/50 rounded-xl flex items-center justify-center text-green-600">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Buyers</p>
                            <p className="text-xl font-bold">1,240 online</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
                        <div className="h-10 w-10 bg-purple-100 dark:bg-purple-950/50 rounded-xl flex items-center justify-center text-purple-600">
                            <Clock className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Last Updated</p>
                            <p className="text-xl font-bold">Just now</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {trendingProducts.map((product, index) => (
                        <div key={product.id} className="relative">
                            <div className="absolute -top-3 -left-3 z-20 h-8 w-8 bg-black text-white rounded-full flex items-center justify-center font-black text-xs border-2 border-white shadow-lg">
                                #{index + 1}
                            </div>
                            <ProductCard product={product} />
                            <div className="mt-2 flex items-center gap-2 px-2">
                                <TrendingUp className="h-3 w-3 text-green-600" />
                                <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                                    High Demand
                                </span>
                                <span className="text-[10px] text-gray-400 font-medium ml-auto">
                                    {product.views || 0} views
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
