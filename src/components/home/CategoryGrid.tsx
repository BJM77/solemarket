"use client";

import Link from 'next/link';
import { Sparkles, Coins, Stamp, Layers, Trophy, Dna, LayoutGrid, ArrowRight } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

const CATEGORIES = [
    { name: 'Pokemon', icon: Dna, href: '/category/pokemon-cards', color: 'text-yellow-600 bg-yellow-100' },
    { name: 'NBA Cards', icon: Layers, href: '/category/nba-trading-cards', color: 'text-orange-600 bg-orange-100' },
    { name: 'Coins', icon: Coins, href: '/coins', color: 'text-blue-600 bg-blue-100' },
    { name: 'Comics', icon: Sparkles, href: '/collectibles/comics', color: 'text-red-600 bg-red-100' },
    { name: 'Stamps', icon: Stamp, href: '/collectibles/stamps', color: 'text-green-600 bg-green-100' },
    { name: 'Memorabilia', icon: Trophy, href: '/category/memorabilia', color: 'text-purple-600 bg-purple-100' },
    { name: 'All Cards', icon: Layers, href: '/category/collector-cards', color: 'text-indigo-600 bg-indigo-100' },
    { name: 'View All', icon: LayoutGrid, href: '/browse', color: 'text-gray-600 bg-gray-100' },
];

export default function CategoryGrid() {
    return (
        <section className="bg-gray-50 dark:bg-gray-900/50 py-8 lg:py-12 border-b border-gray-100 dark:border-gray-800">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Explore Categories</h2>
                    <Link href="/browse" className="text-sm font-medium text-primary hover:text-primary/80 flex items-center">
                        View all <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                    {CATEGORIES.map((cat) => (
                        <Link
                            key={cat.name}
                            href={cat.href}
                            className="group"
                        >
                            <Card className="h-full border-gray-100 dark:border-gray-800 hover:border-primary/50 hover:shadow-md transition-all duration-200">
                                <CardContent className="flex flex-col items-center justify-center p-4 md:p-6 text-center h-full gap-3">
                                    <div className={`p-3 rounded-2xl ${cat.color} group-hover:scale-110 transition-transform duration-200`}>
                                        <cat.icon className="h-6 w-6 md:h-8 md:w-8" />
                                    </div>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm md:text-base">
                                        {cat.name}
                                    </span>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
