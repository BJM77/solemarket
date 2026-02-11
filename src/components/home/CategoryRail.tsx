'use client';

import Link from 'next/link';
import { Sparkles, Coins, Stamp, PenTool, Layers } from 'lucide-react';

const CATEGORIES = [
    { name: 'Pokemon Cards', icon: Layers, href: '/category/pokemon-cards', color: 'bg-blue-100 text-blue-600' },
    { name: 'NBA Cards', icon: Layers, href: '/category/nba-trading-cards', color: 'bg-orange-100 text-orange-600' },
    { name: 'Coins & Money', icon: Coins, href: '/coins', color: 'bg-yellow-100 text-yellow-600' },
    { name: 'Comics', icon: Sparkles, href: '/collectibles/comics', color: 'bg-red-100 text-red-600' },
    { name: 'Stamps', icon: Stamp, href: '/collectibles/stamps', color: 'bg-green-100 text-green-600' },
];

export default function CategoryRail() {
    return (
        <section className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex items-center justify-start gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
                    {CATEGORIES.map((cat) => (
                        <Link
                            key={cat.name}
                            href={cat.href}
                            className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-white hover:shadow-lg hover:shadow-primary/5 hover:scale-105 transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-700 min-w-[200px]"
                        >
                            <div className={`p-2 rounded-xl ${cat.color}`}>
                                <cat.icon className="h-5 w-5" />
                            </div>
                            <span className="font-bold text-gray-700 dark:text-gray-200">{cat.name}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
