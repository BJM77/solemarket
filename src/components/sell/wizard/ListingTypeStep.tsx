
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';

interface ListingTypeStepProps {
    onSelect: (type: 'sneakers') => void;
    selectedType: 'sneakers' | null;
}


export function ListingTypeStep({ onSelect, selectedType }: ListingTypeStepProps) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">What are you listing today?</h1>
                <p className="text-slate-500 dark:text-slate-400">Select a category to customize your listing experience.</p>
            </div>

            <div className="flex justify-center">
                <Card
                    className={`max-w-md w-full cursor-pointer transition-all group hover:shadow-lg ${selectedType === 'sneakers' ? 'border-orange-600 ring-2 ring-orange-600 ring-offset-2' : 'hover:border-orange-500'}`}
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
            </div>
        </div>
    );
}
