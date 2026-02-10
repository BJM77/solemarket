'use client';

/**
 * Customer-Facing Multi-Card Deal Zone
 * Browse and build multi-card deals
 */

import { useState, useEffect } from 'react';
import { getDeals, getProductsByTier } from '@/app/admin/deals/actions';
import { Deal, MultiCardTier } from '@/types/deals';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';


interface DealProgress {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
}

export default function MultiListingDealsPage() {
    const { addBundle, setIsCartOpen } = useCart();
    const [deals, setDeals] = useState<Deal[]>([]);
    const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [selectedTier, setSelectedTier] = useState<MultiCardTier>('bronze');
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
        if (!selectedDeal) return { bronze: 0, silver: 0, gold: 0, platinum: 0 };

        const progress = { bronze: 0, silver: 0, gold: 0, platinum: 0 };

        dealCart.forEach(item => {
            if (item.tier === 'bronze') progress.bronze++;
            else if (item.tier === 'silver') progress.silver++;
            else if (item.tier === 'gold') progress.gold++;
            else if (item.tier === 'platinum') progress.platinum++;
        });

        return progress;
    }

    function addToDeal(product: any) {
        if (!selectedDeal || !selectedTier) return;

        const progress = calculateProgress();
        const required = selectedDeal.requirements;

        if (selectedTier === 'bronze' && progress.bronze >= required.bronze) {
            alert('Bronze tier is full for this deal');
            return;
        }
        if (selectedTier === 'silver' && progress.silver >= required.silver) {
            alert('Silver tier is full for this deal');
            return;
        }
        if (selectedTier === 'gold' && progress.gold >= required.gold) {
            alert('Gold tier is full for this deal');
            return;
        }
        if (selectedTier === 'platinum' && progress.platinum >= required.platinum) {
            alert('Platinum tier is full for this deal');
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
            progress.bronze === selectedDeal.requirements.bronze &&
            progress.silver === selectedDeal.requirements.silver &&
            progress.gold === selectedDeal.requirements.gold &&
            progress.platinum === selectedDeal.requirements.platinum
        );
    }

    function handleAddBundle() {
        if (!selectedDeal || !isDealComplete()) return;
        const productsToAdd = Array.from(dealCart.values());
        addBundle(selectedDeal, productsToAdd);
        setIsCartOpen(true);
        setDealCart(new Map());
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
                <p className="text-gray-600">Check back soon for multi-listing bundle deals!</p>
            </div>
        );
    }

    const progress = calculateProgress();
    const isComplete = isDealComplete();

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Multi-Listing Bundle Deals</h1>

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
                            {deal.requirements.platinum > 0 && `${deal.requirements.platinum} Platinum + `}
                            {deal.requirements.gold > 0 && `${deal.requirements.gold} Gold + `}
                            {deal.requirements.silver > 0 && `${deal.requirements.silver} Silver + `}
                            {deal.requirements.bronze > 0 && `${deal.requirements.bronze} Bronze`}
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
                                {selectedDeal.requirements.platinum > 0 && (
                                    <TierProgress
                                        label="Platinum"
                                        current={progress.platinum}
                                        required={selectedDeal.requirements.platinum}
                                        color="cyan"
                                    />
                                )}
                                {selectedDeal.requirements.gold > 0 && (
                                    <TierProgress
                                        label="Gold"
                                        current={progress.gold}
                                        required={selectedDeal.requirements.gold}
                                        color="yellow"
                                    />
                                )}
                                {selectedDeal.requirements.silver > 0 && (
                                    <TierProgress
                                        label="Silver"
                                        current={progress.silver}
                                        required={selectedDeal.requirements.silver}
                                        color="slate"
                                    />
                                )}
                                {selectedDeal.requirements.bronze > 0 && (
                                    <TierProgress
                                        label="Bronze"
                                        current={progress.bronze}
                                        required={selectedDeal.requirements.bronze}
                                        color="orange"
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
                                onClick={handleAddBundle}
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
                            {selectedDeal.requirements.platinum > 0 && (
                                <button
                                    onClick={() => setSelectedTier('platinum')}
                                    className={`px-4 py-2 rounded-lg font-medium ${selectedTier === 'platinum'
                                        ? 'bg-cyan-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Platinum ({progress.platinum}/{selectedDeal.requirements.platinum})
                                </button>
                            )}
                            {selectedDeal.requirements.gold > 0 && (
                                <button
                                    onClick={() => setSelectedTier('gold')}
                                    className={`px-4 py-2 rounded-lg font-medium ${selectedTier === 'gold'
                                        ? 'bg-yellow-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Gold ({progress.gold}/{selectedDeal.requirements.gold})
                                </button>
                            )}
                            {selectedDeal.requirements.silver > 0 && (
                                <button
                                    onClick={() => setSelectedTier('silver')}
                                    className={`px-4 py-2 rounded-lg font-medium ${selectedTier === 'silver'
                                        ? 'bg-slate-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Silver ({progress.silver}/{selectedDeal.requirements.silver})
                                </button>
                            )}
                            {selectedDeal.requirements.bronze > 0 && (
                                <button
                                    onClick={() => setSelectedTier('bronze')}
                                    className={`px-4 py-2 rounded-lg font-medium ${selectedTier === 'bronze'
                                        ? 'bg-orange-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Bronze ({progress.bronze}/{selectedDeal.requirements.bronze})
                                </button>
                            )}
                        </div>

                        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {products.map(product => (
                                <div key={product.id} className="bg-white rounded-lg shadow p-4">
                                    <img
                                        src={product.imageUrl || '/wtb-wanted-placeholder.png'}
                                        alt={product.title}
                                        className="w-full h-48 object-cover rounded mb-3"
                                        // On error, show placeholder
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            // Prevent infinite loop if placeholder also fails
                                            if (target.src.includes('wtb-wanted-placeholder.png')) return;
                                            target.src = '/wtb-wanted-placeholder.png';
                                        }}
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
