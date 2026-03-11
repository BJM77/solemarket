'use client';

import { Card, CardContent } from '@/components/ui/card';
import { GripVertical, Scan } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ListingTypeStepProps {
    onSelect: (type: 'sneakers' | 'collector-cards') => void;
    selectedType: 'sneakers' | 'collector-cards' | null;
}


export function ListingTypeStep({ onSelect, selectedType }: ListingTypeStepProps) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-white">What are you listing today?</h1>
                <p className="text-slate-400">Select a category to customize your listing experience.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <Card
                    className={`relative cursor-pointer transition-all duration-300 overflow-hidden group hover:-translate-y-1 ${
                        selectedType === 'sneakers'
                            ? 'border-primary ring-2 ring-primary/20 bg-card'
                            : 'border-white/10 hover:border-white/30 bg-card'
                    }`}
                    onClick={() => onSelect('sneakers')}
                >
                    <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                        <div className={`w-12 h-12 border-2 rounded bg-white/5 ${selectedType === 'sneakers' ? 'border-white' : 'border-orange-600 group-hover:border-white'}`} />
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold text-white">Sneakers</h3>
                            <p className="text-sm text-slate-400">Jordan, Yeezy, Nike, etc.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className={`relative cursor-pointer transition-all duration-300 overflow-hidden group hover:-translate-y-1 ${
                        selectedType === 'collector-cards'
                            ? 'border-primary ring-2 ring-primary/20 bg-card'
                            : 'border-white/10 hover:border-white/30 bg-card'
                    }`}
                    onClick={() => onSelect('collector-cards')}
                >
                    <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                        <div className="w-12 h-16 border-2 border-indigo-600 bg-white/5 rounded flex items-center justify-center group-hover:border-white transition-colors">
                            <Scan className="w-6 h-6 text-indigo-600 group-hover:text-white transition-colors" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold text-white">Collector Cards</h3>
                            <p className="text-sm text-slate-400">NBA & Basketball sets.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
