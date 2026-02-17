
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';

interface ListingTypeStepProps {
    onSelect: (type: 'sneakers' | 'accessories') => void;
    selectedType: 'sneakers' | 'accessories' | null;
}


export function ListingTypeStep({ onSelect, selectedType }: ListingTypeStepProps) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">What are you listing today?</h1>
                <p className="text-slate-500 dark:text-slate-400">Select a category to customize your listing experience.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card
                    className={`cursor-pointer transition-all group hover:shadow-lg ${selectedType === 'sneakers' ? 'border-orange-600 ring-2 ring-orange-600 ring-offset-2' : 'hover:border-orange-500'}`}
                    onClick={() => onSelect('sneakers')}
                >
                    <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${selectedType === 'sneakers' ? 'bg-orange-600' : 'bg-orange-100 group-hover:bg-orange-600'}`}>
                            <div className={`w-10 h-10 border-2 rounded bg-white/50 ${selectedType === 'sneakers' ? 'border-white' : 'border-orange-600 group-hover:border-white'}`} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Sneakers</h3>
                            <p className="text-sm text-slate-500">Jordan, Yeezy, Nike, etc.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className={`cursor-pointer transition-all group hover:shadow-lg ${selectedType === 'accessories' ? 'border-blue-600 ring-2 ring-blue-600 ring-offset-2' : 'hover:border-blue-500'}`}
                    onClick={() => onSelect('accessories')}
                >
                    <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${selectedType === 'accessories' ? 'bg-blue-600' : 'bg-blue-100 group-hover:bg-blue-600'}`}>
                            <GripVertical className={`h-8 w-8 ${selectedType === 'accessories' ? 'text-white' : 'text-blue-600 group-hover:text-white'}`} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Accessories</h3>
                            <p className="text-sm text-slate-500">Bags, Socks, Care Products</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
