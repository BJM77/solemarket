'use client';

import { useRouter } from 'next/navigation';

export default function HeroModern({ listingCount = 0 }: { listingCount?: number }) {
    const router = useRouter();

    return (
        <section className="relative min-h-[85vh] flex items-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background dark:from-primary/5 dark:via-background dark:to-background"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[100px] rounded-full pointer-events-none"></div>
            <div className="container mx-auto px-6 relative z-10 pt-20">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-8 backdrop-blur-sm slide-up">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <span className="text-sm font-bold tracking-widest uppercase">Live Market Data Active</span>
                    </div>
                    <h1 className="text-6xl md:text-8xl lg:text-9xl font-black text-slate-900 dark:text-white tracking-tighter mb-6 leading-[0.9] slide-up">
                        KICKS OR<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">CARDS.</span><br />
                        WE'VE GOT<br />THE ROSTER.
                    </h1>
                    <div className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto font-medium slide-up space-y-2" style={{ animationDelay: '0.2s' }}>
                        <p>Australia's premier destination for performance sneakers and NBA cards.</p>
                        <p className="text-primary font-bold">The safest way to upgrade your rotation.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 slide-up mb-16" style={{ animationDelay: '0.3s' }}>
                        <button onClick={() => router.push('/search')} className="w-full sm:w-auto px-10 py-5 bg-primary hover:bg-orange-600 text-white rounded-full font-black uppercase tracking-widest transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(242,108,13,0.4)] flex items-center justify-center gap-2">
                            Search the lineup... <span className="text-xs bg-white text-primary px-2 py-1 rounded-sm ml-2">GO</span>
                        </button>
                        <button onClick={() => router.push('/sell')} className="w-full sm:w-auto px-10 py-5 bg-white dark:bg-card text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-full font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                            Put Yours on the Bench
                        </button>
                    </div>

                    {/* Metrics Section */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto slide-up pt-8 border-t border-slate-200 dark:border-white/10" style={{ animationDelay: '0.4s' }}>
                        <div className="text-center">
                            <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">Local</div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Verified Auth</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">Community</div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Peer-to-Peer</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-black text-primary mb-1">{listingCount.toLocaleString()}</div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Listings</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">0%</div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Selling Fees</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Elements (Sneakers) */}
            <div className="absolute top-20 left-10 w-64 h-64 opacity-50 blur-sm mix-blend-multiply dark:mix-blend-screen float" style={{ animationDuration: '6s' }}>
                <img src="https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&q=80&w=800" alt="Float 1" className="object-cover rounded-full -rotate-12" />
            </div>
            <div className="absolute bottom-20 right-10 w-80 h-80 opacity-60 blur-sm mix-blend-multiply dark:mix-blend-screen float" style={{ animationDuration: '8s', animationDelay: '2s' }}>
                <img src="https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&q=80&w=800" alt="Float 2" className="object-cover rounded-full rotate-12" />
            </div>
        </section>
    );
}
