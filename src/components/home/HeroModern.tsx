'use client';

import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function HeroModern() {
    const router = useRouter();
    const [query, setQuery] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/browse?q=${encodeURIComponent(query)}`);
        }
    };

    return (
        <section className="relative overflow-hidden bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
            {/* Background Decor */}
            <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 pt-20 pb-24 md:pt-32 md:pb-32 relative z-10 text-center">
                <h1 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white tracking-tight mb-6">
                    Find what you love.<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500">
                        Sell what you don't.
                    </span>
                </h1>

                <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                    The safest marketplace for collectors. Verified sellers, escrow protection, and community-driven.
                </p>

                <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl group-hover:bg-primary/30 transition-all opacity-0 group-hover:opacity-100" />
                        <div className="relative flex items-center bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-primary/5 border border-gray-100 dark:border-gray-700 p-2">
                            <Search className="h-6 w-6 text-gray-400 ml-4" />
                            <Input
                                type="text"
                                placeholder="Search cards, coins, comics..."
                                className="flex-1 border-none shadow-none focus-visible:ring-0 text-lg h-14 bg-transparent placeholder:text-gray-400"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                            <Button size="lg" type="submit" className="h-12 px-8 rounded-xl font-bold text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                                Search
                            </Button>
                        </div>
                    </div>
                </form>

                <div className="mt-8 flex items-center justify-center gap-6 text-sm font-medium text-gray-400">
                    <span>Popular:</span>
                    <button onClick={() => router.push('/browse?q=Pokemon')} className="hover:text-primary transition-colors">Pokemon</button>
                    <button onClick={() => router.push('/browse?q=NBA')} className="hover:text-primary transition-colors">NBA</button>
                    <button onClick={() => router.push('/browse?q=Marvel')} className="hover:text-primary transition-colors">Marvel</button>
                </div>
            </div>
        </section>
    );
}
