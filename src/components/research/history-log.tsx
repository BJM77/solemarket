'use client';

import { Trash2, PlusCircle, ShoppingCart, DollarSign, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import type { ScanHistoryItem } from '@/lib/research-types';
import { formatCardDetails } from '@/lib/card-logic';

interface HistoryLogProps {
    history: ScanHistoryItem[];
    onDeleteItem: (id: string) => void;
    onAddNameToKeep: (name: string, sport?: string) => void;
}

export default function HistoryLog({
    history,
    onDeleteItem,
    onAddNameToKeep,
}: HistoryLogProps) {
    const router = useRouter();

    const handleListOnMarketplace = (item: ScanHistoryItem) => {
        const listingData = {
            title: `${item.name}${item.cardYear ? ` ${item.cardYear}` : ''}${item.brand ? ` ${item.brand}` : ''}${item.cardType ? ` ${item.cardType}` : ''}`,
            description: `${item.brand || 'Trading'} Card featuring ${item.name}${item.sport ? ` - ${item.sport}` : ''}${item.cardType ? ` ${item.cardType}` : ''}`,
            category: 'Collector Cards',
            subCategory: 'Trading Cards',
            year: item.cardYear,
            manufacturer: item.brand,
            imageDataUri: item.imageDataUri,
        };

        sessionStorage.setItem('researchScanData', JSON.stringify(listingData));
        router.push('/sell/create?from=research');
    };

    if (history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center p-4">
                <p className="text-muted-foreground">No scans yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                    Use the camera to scan trading cards
                </p>
            </div>
        );
    }

    return (
        <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
                {history.map((item) => (
                    <div
                        key={item.id}
                        className={`p-4 rounded-lg border transition-all hover:shadow-md ${item.isPrizmRookie
                                ? 'border-yellow-400 bg-gradient-to-r from-yellow-50 to-pink-50'
                                : item.isKeeper
                                    ? 'border-green-300 bg-green-50'
                                    : 'border-gray-200 bg-white'
                            }`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-sm truncate">
                                        {item.name}
                                    </h3>
                                    {item.isPrizmRookie && (
                                        <Badge className="bg-gradient-to-r from-yellow-400 to-pink-500 text-white text-xs">
                                            PRIZM
                                        </Badge>
                                    )}
                                    {item.isKeeper && !item.isPrizmRookie && (
                                        <Badge variant="default" className="bg-green-600 text-xs">
                                            KEEP
                                        </Badge>
                                    )}
                                </div>

                                <p className="text-xs text-muted-foreground mb-2">
                                    {formatCardDetails(item)}
                                </p>

                                {item.salesData && item.salesData.averagePrice && (
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                                        <div className="flex items-center gap-1">
                                            <DollarSign className="w-3 h-3" />
                                            <span className="font-semibold text-green-600">
                                                ${item.salesData.averagePrice}
                                            </span>
                                            <span>avg</span>
                                        </div>
                                        {item.salesData.salesCount && (
                                            <div className="flex items-center gap-1">
                                                <TrendingUp className="w-3 h-3" />
                                                <span>{item.salesData.salesCount} sales</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <p className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                                </p>

                                <div className="flex gap-2 mt-3">
                                    <Button
                                        onClick={() => handleListOnMarketplace(item)}
                                        size="sm"
                                        variant="default"
                                        className="text-xs h-7"
                                    >
                                        <ShoppingCart className="w-3 h-3 mr-1" />
                                        List
                                    </Button>
                                    {!item.isKeeper && (
                                        <Button
                                            onClick={() => onAddNameToKeep(item.name, item.sport)}
                                            size="sm"
                                            variant="outline"
                                            className="text-xs h-7"
                                        >
                                            <PlusCircle className="w-3 h-3 mr-1" />
                                            Keep
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <Button
                                onClick={() => onDeleteItem(item.id)}
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}
