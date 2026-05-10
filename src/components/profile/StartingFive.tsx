'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trophy, Sparkles, X } from 'lucide-react';
import Image from 'next/image';
import type { Product } from '@/lib/types';
import Link from 'next/link';

interface StartingFiveProps {
    items: Product[];
    isEditable?: boolean;
    onAdd?: () => void;
    onRemove?: (id: string) => void;
}

/**
 * "Starting 5" component for Hooper Profiles.
 * Showcase the user's top 5 items in their collection.
 */
export function StartingFive({ items, isEditable, onAdd, onRemove }: StartingFiveProps) {
    const slots = [0, 1, 2, 3, 4];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="bg-primary p-2 rounded-lg">
                        <Trophy className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight">The Starting 5</h3>
                </div>
                {isEditable && items.length < 5 && (
                    <Button variant="outline" size="sm" onClick={onAdd} className="h-8 rounded-full border-primary/20 hover:border-primary">
                        <Plus className="h-4 w-4 mr-1" /> Add to Lineup
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {slots.map((idx) => {
                    const item = items[idx];
                    return (
                        <div key={idx} className="relative group">
                            {item ? (
                                <Link href={`/product/${item.id}`}>
                                    <div className="aspect-[4/5] relative rounded-2xl overflow-hidden border-2 border-primary/10 hover:border-primary transition-all shadow-lg group">
                                        <Image
                                            src={item.imageUrls[0]}
                                            alt={item.title}
                                            fill
                                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="absolute bottom-3 left-3 right-3 text-white opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                            <p className="text-[10px] font-black uppercase truncate">{item.brand}</p>
                                            <p className="text-xs font-bold truncate leading-none">{item.title}</p>
                                        </div>
                                    </div>
                                </Link>
                            ) : (
                                <div 
                                    className="aspect-[4/5] rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 text-slate-400 group-hover:bg-slate-100 dark:group-hover:bg-slate-900 transition-colors cursor-pointer"
                                    onClick={onAdd}
                                >
                                    <span className="text-3xl font-black opacity-20">#{idx + 1}</span>
                                    <Plus className="h-6 w-6 mt-2 opacity-20" />
                                </div>
                            )}

                            {isEditable && item && (
                                <button
                                    onClick={() => onRemove?.(item.id)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
            
            <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-primary shrink-0" />
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Your **Starting 5** is shown on your public profile. Select your rarest cards and most performance-ready kicks.
                </p>
            </div>
        </div>
    );
}
