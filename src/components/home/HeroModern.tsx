'use client';

import { Search, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { AdUnit } from '@/components/ads/AdUnit';
import { cn } from '@/lib/utils';

export default function HeroModern({ listingCount = 0 }: { listingCount?: number }) {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [particles, setParticles] = useState<any[]>([]);

    useEffect(() => {
        // Generate particles only on the client
        const newParticles = [...Array(12)].map((_, i) => ({
            id: i,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            duration: 5 + Math.random() * 5,
            x: (Math.random() - 0.5) * 200,
            y: (Math.random() - 0.5) * 200,
        }));
        setParticles(newParticles);
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/browse?q=${encodeURIComponent(query)}`);
        }
    };

    return (
        <section className="relative overflow-hidden bg-white dark:bg-deep-black min-h-[80vh] flex items-center border-b border-border/10">
            {/* Background Decor & Particles */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 inset-x-0 h-full bg-gradient-to-b from-primary/10 via-transparent to-transparent opacity-50" />
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-secondary/5 rounded-full blur-[100px]" />

                {/* Simulated Particles */}
                {particles.map((p) => (
                    <div
                        key={p.id}
                        className="absolute w-1 h-1 bg-primary/20 rounded-full"
                        style={{
                            top: p.top,
                            left: p.left,
                            animation: `particle ${p.duration}s infinite linear`,
                            '--tw-translate-x': `${p.x}px`,
                            '--tw-translate-y': `${p.y}px`,
                        } as any}
                    />
                ))}
            </div>

            <div className="max-w-[1440px] mx-auto px-4 md:px-10 w-full relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-12 md:py-24">
                <div className="text-left slide-up">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-6">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Live Market Data Active</span>
                    </div>

                    <h1 className="text-4xl md:text-7xl font-black text-gray-900 dark:text-white tracking-tight mb-6 leading-[0.95]">
                        These kicks aren't done. <br />
                        <span className="gradient-text">
                            They're just Benched.
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl font-medium text-gray-600 dark:text-gray-400 max-w-xl mb-10 leading-relaxed">
                        Performance basketball sneakers waiting for their second half. <br className="hidden md:block" />
                        The safest way to rotate your lineup.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 mb-12">
                        <form onSubmit={handleSearch} className="flex-1 max-w-md relative group">
                            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl group-hover:bg-primary/30 transition-all opacity-0 group-hover:opacity-100" />
                            <div className="relative flex items-center bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-border/50 p-1.5">
                                <Search className="h-5 w-5 text-gray-400 ml-4" />
                                <Input
                                    type="text"
                                    placeholder="Search the lineup..."
                                    className="flex-1 border-none shadow-none focus-visible:ring-0 text-base h-12 bg-transparent placeholder:text-gray-400"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                                <Button size="lg" type="submit" className="h-11 px-6 rounded-xl font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 text-white">
                                    GO
                                </Button>
                            </div>
                        </form>
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => router.push('/sell/create')}
                            className="h-14 px-8 rounded-2xl font-bold border-2 hover:bg-gray-50 transition-all"
                        >
                            Put Yours on the Bench
                        </Button>
                    </div>

                    {/* Stats Counter */}
                    <div className="flex items-center gap-8 md:gap-12 pt-8 border-t border-border/10">
                        <div>
                            <p className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">Local</p>
                            <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Community</p>
                        </div>
                        <div>
                            <p className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
                                {listingCount > 0 ? (listingCount < 1000 ? listingCount : `${(listingCount / 1000).toFixed(1)}k+`) : '—'}
                            </p>
                            <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Listings</p>
                        </div>
                        <div>
                            <p className="text-2xl md:text-3xl font-black text-primary">0%</p>
                            <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Selling Fees</p>
                        </div>
                    </div>
                </div>

                <div className="hidden lg:block relative float">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-[150px] scale-75 animate-pulse" />
                    <div className="relative z-10 scale-110 -rotate-12 hover:rotate-0 transition-transform duration-700">
                        <img
                            src="https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&q=80&w=1000"
                            alt="Hero Sneaker"
                            className="w-full h-auto drop-shadow-[0_35px_35px_rgba(0,0,0,0.4)] rounded-3xl"
                        />
                    </div>



                    <div className="absolute bottom-10 -right-10 glass-card p-4 rounded-2xl flex items-center gap-3 animate-pulse shadow-2xl delay-700">
                        <div className="bg-orange-500 p-2 rounded-lg text-white">
                            <Zap className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase text-foreground">Fast Shipping</p>
                            <p className="text-[10px] text-muted-foreground">2-3 Business Days</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
