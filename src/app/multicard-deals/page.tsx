'use client';

/**
 * Customer-Facing Multi-Card Deal Zone
 * Browse and build multi-card deals
 */

import { useState, useEffect } from 'react';
import { getDeals, getProductsByTier } from '@/app/admin/deals/actions';
import { Deal, MultiCardTier } from '@/types/deals';

interface DealProgress {
    base: number;
    premium: number;
    limited: number;
}

export default function MultiCardDealsPage() {
    const [deals, setDeals] = useState<Deal[]>([]);
    const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [selectedTier, setSelectedTier] = useState<MultiCardTier>('base');
    const [dealCart, setDealCart] = useState<Map<string, any>>(new Map());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDeals();
    }, []);

    useEffect(() => {
        if (selectedDeal && selectedTier) {
            loadProductsForTier(selectedTier);
        }
    }, [selectedDeal, selectedTier]);

    async function loadDeals() {
        setLoading(true);
        const data = await getDeals(true);
        setDeals(data);
        if (data.length > 0) {
            setSelectedDeal(data[0]);
        }
        setLoading(false);
    }

    async function loadProductsForTier(tier: MultiCardTier) {
        if (!tier) return;
        const data = await getProductsByTier(tier, 50);
        setProducts(data);
    }

    function calculateProgress(): DealProgress {
        if (!selectedDeal) return { base: 0, premium: 0, limited: 0 };

        const progress = { base: 0, premium: 0, limited: 0 };

        dealCart.forEach(item => {
            if (item.tier === 'base') progress.base++;
            else if (item.tier === 'premium') progress.premium++;
            else if (item.tier === 'limited') progress.limited++;
        });

        return progress;
    }

    function addToDeal(product: any) {
        if (!selectedDeal || !selectedTier) return;

        const progress = calculateProgress();
        const required = selectedDeal.requirements;

        if (selectedTier === 'base' && progress.base >= required.base) {
            alert('Base tier is full for this deal');
            return;
        }
        if (selectedTier === 'premium' && progress.premium >= required.premium) {
            alert('Premium tier is full for this deal');
            return;
        }
        if (selectedTier === 'limited' && progress.limited >= required.limited) {
            alert('Limited tier is full for this deal');
            return;
        }

        const newCart = new Map(dealCart);
        newCart.set(product.id, {
            ...product,
            tier: selectedTier,
            dealId: selectedDeal.id,
        });
        setDealCart(newCart);
    }

    function removeFromDeal(productId: string) {
        const newCart = new Map(dealCart);
        newCart.delete(productId);
        setDealCart(newCart);
    }

    function isDealComplete(): boolean {
        if (!selectedDeal) return false;
        const progress = calculateProgress();
        return (
            progress.base === selectedDeal.requirements.base &&
            progress.premium === selectedDeal.requirements.premium &&
            progress.limited === selectedDeal.requirements.limited
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">Loading deals...</div>
            </div>
        );
    }

    if (deals.length === 0) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="text-3xl font-bold mb-4">No Active Deals</h1>
                <p className="text-gray-600">Check back soon for multi-card bundle deals!</p>
            </div>
        );
    }

    const progress = calculateProgress();
    const isComplete = isDealComplete();

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Multi-Card Bundle Deals</h1>

            {/* Deal Selector */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
                {deals.map(deal => (
                    <button
                        key={deal.id}
                        onClick={() => {
                            setSelectedDeal(deal);
                            setDealCart(new Map());
                        }}
                        className={`p-6 rounded-lg border-2 text-left transition ${selectedDeal?.id === deal.id
                                ? 'border-blue-600 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                    >
                        <h3 className="font-bold text-lg mb-2">{deal.name}</h3>
                        <p className="text-sm text-gray-600 mb-3">{deal.description}</p>
                        <div className="text-2xl font-bold text-green-600">${deal.price.toFixed(2)}</div>
                        <div className="text-xs text-gray-500 mt-2">
                            {deal.requirements.limited > 0 && `${deal.requirements.limited} Limited + `}
                            {deal.requirements.premium > 0 && `${deal.requirements.premium} Premium + `}
                            {deal.requirements.base > 0 && `${deal.requirements.base} Base`}
                        </div>
                    </button>
                ))}
            </div>

            {selectedDeal && (
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Progress Tracker */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4">
                            <h2 className="text-xl font-bold mb-4">Your Bundle Progress</h2>

                            <div className="mb-6">
                                <div className="text-3xl font-bold text-green-600 mb-1">
                                    ${selectedDeal.price.toFixed(2)}
                                </div>
                                <div className="text-sm text-gray-600">
                                    {isComplete ? '✓ Bundle Complete!' : 'Bundle Price'}
                                </div>
                            </div>

                            {/* Tier Progress */}
                            <div className="space-y-4 mb-6">
                                {selectedDeal.requirements.limited > 0 && (
                                    <TierProgress
                                        label="Limited"
                                        current={progress.limited}
                                        required={selectedDeal.requirements.limited}
                                        color="purple"
                                    />
                                )}
                                {selectedDeal.requirements.premium > 0 && (
                                    <TierProgress
                                        label="Premium"
                                        current={progress.premium}
                                        required={selectedDeal.requirements.premium}
                                        color="blue"
                                    />
                                )}
                                {selectedDeal.requirements.base > 0 && (
                                    <TierProgress
                                        label="Base"
                                        current={progress.base}
                                        required={selectedDeal.requirements.base}
                                        color="gray"
                                    />
                                )}
                            </div>

                            {/* Selected Cards */}
                            {dealCart.size > 0 && (
                                <div className="mb-6">
                                    <h3 className="font-semibold mb-2">Selected Cards ({dealCart.size})</h3>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {Array.from(dealCart.values()).map(item => (
                                            <div key={item.id} className="flex items-center gap-2 text-sm">
                                                <img src={item.imageUrl} alt={item.title} className="w-8 h-8 object-cover rounded" />
                                                <span className="flex-1 truncate">{item.title}</span>
                                                <button
                                                    onClick={() => removeFromDeal(item.id)}
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                disabled={!isComplete}
                                className={`w-full py-3 rounded-lg font-semibold ${isComplete
                                        ? 'bg-green-600 text-white hover:bg-green-700'
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                {isComplete ? 'Add Bundle to Cart' : 'Complete Bundle to Continue'}
                            </button>
                        </div>
                    </div>

                    {/* Product Browser */}
                    <div className="lg:col-span-2">
                        <div className="flex gap-2 mb-6">
                            {selectedDeal.requirements.limited > 0 && (
                                <button
                                    onClick={() => setSelectedTier('limited')}
                                    className={`px-4 py-2 rounded-lg font-medium ${selectedTier === 'limited'
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Limited ({progress.limited}/{selectedDeal.requirements.limited})
                                </button>
                            )}
                            {selectedDeal.requirements.premium > 0 && (
                                <button
                                    onClick={() => setSelectedTier('premium')}
                                    className={`px-4 py-2 rounded-lg font-medium ${selectedTier === 'premium'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Premium ({progress.premium}/{selectedDeal.requirements.premium})
                                </button>
                            )}
                            {selectedDeal.requirements.base > 0 && (
                                <button
                                    onClick={() => setSelectedTier('base')}
                                    className={`px-4 py-2 rounded-lg font-medium ${selectedTier === 'base'
                                            ? 'bg-gray-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Base ({progress.base}/{selectedDeal.requirements.base})
                                </button>
                            )}
                        </div>

                        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {products.map(product => (
                                <div key={product.id} className="bg-white rounded-lg shadow p-4">
                                    <img
                                        src={product.imageUrl || '/placeholder.png'}
                                        alt={product.title}
                                        className="w-full h-48 object-cover rounded mb-3"
                                    />
                                    <h3 className="font-semibold mb-2 truncate">{product.title}</h3>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500 line-through text-sm">${product.price}</span>
                                        <button
                                            onClick={() => addToDeal(product)}
                                            disabled={dealCart.has(product.id)}
                                            className={`px-3 py-1 rounded text-sm ${dealCart.has(product.id)
                                                    ? 'bg-gray-300 text-gray-500'
                                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                                }`}
                                        >
                                            {dealCart.has(product.id) ? 'Added' : 'Add'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
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
    color: 'purple' | 'blue' | 'gray';
}) {
    const percentage = (current / required) * 100;
    const isComplete = current === required;

    const colorClasses = {
        purple: 'bg-purple-600',
        blue: 'bg-blue-600',
        gray: 'bg-gray-600',
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
