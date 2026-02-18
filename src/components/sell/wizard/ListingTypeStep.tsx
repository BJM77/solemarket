
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ListingTypeStepProps {
    onSelect: (type: 'sneakers' | 'trading-cards') => void;
    selectedType: 'sneakers' | 'trading-cards' | null;
}


export function ListingTypeStep({ onSelect, selectedType }: ListingTypeStepProps) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">What are you listing today?</h1>
                <p className="text-slate-500 dark:text-slate-400">Select a category to customize your listing experience.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <Card
                    className={`cursor-pointer transition-all group hover:shadow-lg ${selectedType === 'sneakers' ? 'border-orange-600 ring-2 ring-orange-600 ring-offset-2' : 'hover:border-orange-500'}`}
                    onClick={() => onSelect('sneakers')}
                >
                    <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${selectedType === 'sneakers' ? 'bg-orange-600' : 'bg-orange-100 group-hover:bg-orange-600'}`}>
                            <div className={`w-12 h-12 border-2 rounded bg-white/50 ${selectedType === 'sneakers' ? 'border-white' : 'border-orange-600 group-hover:border-white'}`} />
                        </div>
                        <div>
                            <h3 className="font-bold text-xl uppercase tracking-tight">Sneakers</h3>
                            <p className="text-sm text-slate-500">Jordan, Yeezy, Nike, etc.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className={`cursor-pointer transition-all group hover:shadow-lg ${selectedType === 'trading-cards' ? 'border-indigo-600 ring-2 ring-indigo-600 ring-offset-2' : 'hover:border-indigo-500'}`}
                    onClick={() => onSelect('trading-cards')}
                >
                    <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${selectedType === 'trading-cards' ? 'bg-indigo-600' : 'bg-indigo-100 group-hover:bg-indigo-600'}`}>
                            <div className="w-12 h-16 border-2 border-indigo-600 bg-white/50 rounded flex items-center justify-center group-hover:border-white transition-colors">
                                <span className={cn("text-[10px] font-black", selectedType === 'trading-cards' ? "text-white" : "text-indigo-600 group-hover:text-white")}>PSA</span>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-xl uppercase tracking-tight">Trading Cards</h3>
                            <p className="text-sm text-slate-500">NBA & Basketball sets.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
