
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';

interface ListingTypeStepProps {
    onSelect: (type: 'cards' | 'coins' | 'general') => void;
    selectedType: 'cards' | 'coins' | 'general' | null;
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
                    className={`cursor-pointer transition-all group hover:shadow-lg ${selectedType === 'cards' ? 'border-blue-600 ring-2 ring-blue-600 ring-offset-2' : 'hover:border-blue-500'}`}
                    onClick={() => onSelect('cards')}
                >
                    <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${selectedType === 'cards' ? 'bg-blue-600' : 'bg-blue-100 group-hover:bg-blue-600'}`}>
                            <div className={`w-10 h-10 border-2 rounded bg-white/50 ${selectedType === 'cards' ? 'border-white' : 'border-blue-600 group-hover:border-white'}`} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Trading Card</h3>
                            <p className="text-sm text-slate-500">Pokemon, Sports, TCG</p>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className={`cursor-pointer transition-all group hover:shadow-lg ${selectedType === 'coins' ? 'border-yellow-500 ring-2 ring-yellow-500 ring-offset-2' : 'hover:border-yellow-500'}`}
                    onClick={() => onSelect('coins')}
                >
                    <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${selectedType === 'coins' ? 'bg-yellow-500' : 'bg-yellow-100 group-hover:bg-yellow-500'}`}>
                            <div className={`w-10 h-10 border-2 rounded-full bg-yellow-200/50 ${selectedType === 'coins' ? 'border-white' : 'border-yellow-600 group-hover:border-white'}`} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Coin / Bullion</h3>
                            <p className="text-sm text-slate-500">Coins, Notes, Precious Metals</p>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className={`cursor-pointer transition-all group hover:shadow-lg ${selectedType === 'general' ? 'border-green-600 ring-2 ring-green-600 ring-offset-2' : 'hover:border-green-500'}`}
                    onClick={() => onSelect('general')}
                >
                    <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${selectedType === 'general' ? 'bg-green-600' : 'bg-green-100 group-hover:bg-green-600'}`}>
                            <GripVertical className={`h-8 w-8 ${selectedType === 'general' ? 'text-white' : 'text-green-600 group-hover:text-white'}`} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">General Item</h3>
                            <p className="text-sm text-slate-500">Everything else</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
