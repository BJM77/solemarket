'use client';

import { useMemo } from 'react';
import { Deal, DealProgress } from '@/types/deals';

interface DealProgressTrackerProps {
    deal: Deal;
    progress: DealProgress;
    dealCart: Map<string, any>;
    onRemoveFromDeal: (productId: string) => void;
    onAddBundle: () => void;
    isComplete: boolean;
}

export function DealProgressTracker({
    deal,
    progress,
    dealCart,
    onRemoveFromDeal,
    onAddBundle,
    isComplete
}: DealProgressTrackerProps) {
    return (
        <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4 h-full flex flex-col">
            <h2 className="text-xl font-bold mb-4">Your Bundle Progress</h2>

            <div className="mb-6">
                <div className="text-3xl font-bold text-green-600 mb-1">
                    ${deal.price.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">
                    {isComplete ? '✓ Bundle Complete!' : 'Bundle Price'}
                </div>
            </div>

            {/* Tier Progress */}
            <div className="space-y-4 mb-6 flex-1 overflow-y-auto">
                {deal.requirements.platinum > 0 && (
                    <TierProgress
                        label="Platinum"
                        current={progress.platinum}
                        required={deal.requirements.platinum}
                        color="cyan"
                    />
                )}
                {deal.requirements.gold > 0 && (
                    <TierProgress
                        label="Gold"
                        current={progress.gold}
                        required={deal.requirements.gold}
                        color="yellow"
                    />
                )}
                {deal.requirements.silver > 0 && (
                    <TierProgress
                        label="Silver"
                        current={progress.silver}
                        required={deal.requirements.silver}
                        color="slate"
                    />
                )}
                {deal.requirements.bronze > 0 && (
                    <TierProgress
                        label="Bronze"
                        current={progress.bronze}
                        required={deal.requirements.bronze}
                        color="orange"
                    />
                )}
            </div>

            {/* Selected Cards */}
            {dealCart.size > 0 && (
                <div className="mb-6 border-t pt-4">
                    <h3 className="font-semibold mb-2">Selected Cards ({dealCart.size})</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {Array.from(dealCart.values()).map(item => (
                            <div key={item.id} className="flex items-center gap-2 text-sm border p-2 rounded">
                                <img src={item.imageUrl} alt={item.title} className="w-8 h-8 object-cover rounded" />
                                <span className="flex-1 truncate">{item.title}</span>
                                <button
                                    onClick={() => onRemoveFromDeal(item.id)}
                                    className="text-red-600 hover:text-red-700 p-1"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <button
                onClick={onAddBundle}
                disabled={!isComplete}
                className={`w-full py-3 rounded-lg font-semibold mt-auto ${isComplete
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
            >
                {isComplete ? 'Add Bundle to Cart' : 'Complete Bundle to Continue'}
            </button>
        </div>
    );
}

function TierProgress({
    label,
    current,
    required,
    color
}: {
    label: string;
    current: number;
    required: number;
    color: 'orange' | 'slate' | 'yellow' | 'cyan';
}) {
    const percentage = Math.min((current / required) * 100, 100);
    const isComplete = current >= required;

    const colorClasses = {
        orange: 'bg-orange-500',
        slate: 'bg-slate-500',
        yellow: 'bg-yellow-500',
        cyan: 'bg-cyan-500',
    };

    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{label}</span>
                <span className={isComplete ? 'text-green-600 font-semibold' : 'text-gray-600'}>
                    {current}/{required} {isComplete && '✓'}
                </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className={`h-full ${colorClasses[color]} transition-all`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}
