'use client';

import type { ScannedCard } from '@/lib/types/scan';
import { DollarSign, TrendingUp, Package, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CardThumbnailProps {
    card: ScannedCard;
}

export default function CardThumbnail({ card }: CardThumbnailProps) {
    const getActionColor = (action: string) => {
        switch (action) {
            case 'grade':
                return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
            case 'keep':
                return 'bg-green-500/10 text-green-700 border-green-500/20';
            case 'bulk':
                return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
            default:
                return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
        }
    };

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'grade':
                return <Award className="w-3 h-3" />;
            case 'keep':
                return <TrendingUp className="w-3 h-3" />;
            case 'bulk':
                return <Package className="w-3 h-3" />;
            default:
                return null;
        }
    };

    const getActionLabel = (action: string) => {
        switch (action) {
            case 'grade':
                return 'Send to Grade';
            case 'keep':
                return 'List Individually';
            case 'bulk':
                return 'Bulk Lot';
            default:
                return action;
        }
    };

    return (
        <div className="border rounded-lg overflow-hidden bg-card hover:shadow-md transition-shadow">
            {/* Thumbnail */}
            <div className="aspect-[2.5/3.5] bg-muted relative">
                {card.thumbnailUrl ? (
                    <img
                        src={card.thumbnailUrl}
                        alt={card.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        No Image
                    </div>
                )}

                {/* Confidence Badge */}
                {card.confidence > 0 && (
                    <div className="absolute top-2 right-2">
                        <Badge
                            variant="secondary"
                            className="text-xs bg-black/70 text-white border-none"
                        >
                            {card.confidence}%
                        </Badge>
                    </div>
                )}
            </div>

            {/* Card Info */}
            <div className="p-3 space-y-2">
                <div>
                    <h3 className="font-semibold text-sm line-clamp-1">{card.name}</h3>
                    {card.set && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{card.set}</p>
                    )}
                </div>

                {/* Value */}
                <div className="flex items-center gap-1 text-sm font-bold">
                    <DollarSign className="w-3 h-3" />
                    <span>${card.estimatedValue.toFixed(2)}</span>
                </div>

                {/* Action */}
                <Badge className={`w-full justify-center gap-1 ${getActionColor(card.action)}`}>
                    {getActionIcon(card.action)}
                    <span className="text-xs font-medium">{getActionLabel(card.action)}</span>
                </Badge>

                {/* Additional Info */}
                {(card.cardNumber || card.condition) && (
                    <div className="text-xs text-muted-foreground space-y-0.5">
                        {card.cardNumber && <p>#{card.cardNumber}</p>}
                        {card.condition && card.condition !== 'Unknown' && (
                            <p>{card.condition}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
