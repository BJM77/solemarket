'use client';

import Link from 'next/link';
import type { ScannedCard } from '@/lib/types/scan';
import CardThumbnail from './CardThumbnail';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, TrendingUp, Package, DollarSign, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScanResultsProps {
    cards: ScannedCard[];
    totalValue: number;
    processingTime?: number;
}

export default function ScanResults({ cards, totalValue, processingTime }: ScanResultsProps) {
    const gradeCards = cards.filter(c => c.action === 'grade');
    const keepCards = cards.filter(c => c.action === 'keep');
    const bulkCards = cards.filter(c => c.action === 'bulk');

    const gradeValue = gradeCards.reduce((sum, c) => sum + c.estimatedValue, 0);
    const keepValue = keepCards.reduce((sum, c) => sum + c.estimatedValue, 0);
    const bulkValue = bulkCards.reduce((sum, c) => sum + c.estimatedValue, 0);

    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Scan Results</span>
                        {processingTime && (
                            <span className="text-sm font-normal text-muted-foreground flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {(processingTime / 1000).toFixed(1)}s
                            </span>
                        )}
                    </CardTitle>
                    <CardDescription>
                        {cards.length} cards detected • Total value: ${totalValue.toFixed(2)}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Grade */}
                        <div className="p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                            <div className="flex items-center gap-2 mb-2">
                                <Award className="w-5 h-5 text-yellow-700" />
                                <h3 className="font-semibold text-yellow-700">Send to Grade</h3>
                            </div>
                            <p className="text-2xl font-bold">{gradeCards.length}</p>
                            <p className="text-sm text-muted-foreground">
                                ${gradeValue.toFixed(2)} total
                            </p>
                        </div>

                        {/* Keep */}
                        <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="w-5 h-5 text-green-700" />
                                <h3 className="font-semibold text-green-700">List Individually</h3>
                            </div>
                            <p className="text-2xl font-bold">{keepCards.length}</p>
                            <p className="text-sm text-muted-foreground">
                                ${keepValue.toFixed(2)} total
                            </p>
                        </div>

                        {/* Bulk */}
                        <div className="p-4 rounded-lg bg-gray-500/5 border border-gray-500/20">
                            <div className="flex items-center gap-2 mb-2">
                                <Package className="w-5 h-5 text-gray-700" />
                                <h3 className="font-semibold text-gray-700">Bulk Lot</h3>
                            </div>
                            <p className="text-2xl font-bold">{bulkCards.length}</p>
                            <p className="text-sm text-muted-foreground">
                                ${bulkValue.toFixed(2)} total
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Grade Cards */}
            {gradeCards.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Award className="w-5 h-5 text-yellow-700" />
                            Send to Grade ({gradeCards.length})
                        </h2>
                        <p className="text-sm text-muted-foreground">${gradeValue.toFixed(2)}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {gradeCards.map(card => (
                            <CardThumbnail key={card.id} card={card} />
                        ))}
                    </div>
                </div>
            )}

            {/* Keep Cards */}
            {keepCards.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-700" />
                            List Individually ({keepCards.length})
                        </h2>
                        <p className="text-sm text-muted-foreground">${keepValue.toFixed(2)}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {keepCards.map(card => (
                            <CardThumbnail key={card.id} card={card} />
                        ))}
                    </div>
                </div>
            )}

            {/* Bulk Cards */}
            {bulkCards.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Package className="w-5 h-5 text-gray-700" />
                            Bulk Lot ({bulkCards.length})
                        </h2>
                        <p className="text-sm text-muted-foreground">${bulkValue.toFixed(2)}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {bulkCards.map(card => (
                            <CardThumbnail key={card.id} card={card} />
                        ))}
                    </div>
                </div>
            )}

import Link from 'next/link';

// ... (imports remain the same, ensure Link is not duplicated if already present)

// ... inside the component return ...

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
                <Button size="lg" className="flex-1 h-14 text-lg font-bold shadow-xl shadow-primary/20" asChild>
                    <Link href="/sell/create">
                        <DollarSign className="w-5 h-5 mr-2" />
                        Sell These Items Now
                    </Link>
                </Button>
                <Button size="lg" variant="outline" className="flex-1 h-14">
                    Export to CSV
                </Button>
            </div>
        </div>
    );
}
