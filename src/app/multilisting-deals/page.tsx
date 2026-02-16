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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";
import { DealProgressTracker } from '@/components/deals/DealProgressTracker';


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
                <div className="grid lg:grid-cols-3 gap-8 pb-24 lg:pb-0">
                    {/* Progress Tracker (Desktop Sticky) */}
                    <div className="hidden lg:block lg:col-span-1">
                        <DealProgressTracker
                            deal={selectedDeal}
                            progress={progress}
                            dealCart={dealCart}
                            onRemoveFromDeal={removeFromDeal}
                            onAddBundle={handleAddBundle}
                            isComplete={isComplete}
                        />
                    </div>

                    {/* Product Browser */}
                    <div className="lg:col-span-2">
                        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                            {selectedDeal.requirements.platinum > 0 && (
                                <button
                                    onClick={() => setSelectedTier('platinum')}
                                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${selectedTier === 'platinum'
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
                                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${selectedTier === 'gold'
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
                                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${selectedTier === 'silver'
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
                                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${selectedTier === 'bronze'
                                        ? 'bg-orange-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Bronze ({progress.bronze}/{selectedDeal.requirements.bronze})
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {products.map(product => (
                                <div key={product.id} className="bg-white rounded-lg shadow p-3 sm:p-4">
                                    <div className="aspect-square relative mb-3">
                                        <img
                                            src={product.imageUrl || '/wtb-wanted-placeholder.png'}
                                            alt={product.title}
                                            className="w-full h-full object-cover rounded"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                if (target.src.includes('wtb-wanted-placeholder.png')) return;
                                                target.src = '/wtb-wanted-placeholder.png';
                                            }}
                                        />
                                    </div>
                                    <h3 className="font-semibold mb-2 text-sm sm:text-base line-clamp-2 h-10 sm:h-auto">{product.title}</h3>
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                        <span className="text-gray-500 line-through text-xs sm:text-sm">${product.price}</span>
                                        <button
                                            onClick={() => addToDeal(product)}
                                            disabled={dealCart.has(product.id)}
                                            className={`w-full sm:w-auto px-3 py-1.5 rounded text-xs sm:text-sm font-medium ${dealCart.has(product.id)
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

                    {/* Mobile Bottom Bar for Bundle Progress */}
                    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:hidden z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                        <div className="container mx-auto flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Bundle Total</span>
                                <span className="text-lg font-bold text-green-600">${selectedDeal.price.toFixed(2)}</span>
                            </div>

                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button className="gap-2">
                                        <ChevronUp className="h-4 w-4" />
                                        {isComplete ? 'Review Bundle' : `View Progress (${dealCart.size})`}
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="bottom" className="h-[80vh] flex flex-col p-0">
                                    <SheetHeader className="p-6 border-b">
                                        <SheetTitle>Bundle Progress</SheetTitle>
                                    </SheetHeader>
                                    <div className="flex-1 overflow-y-auto p-6">
                                        <DealProgressTracker
                                            deal={selectedDeal}
                                            progress={progress}
                                            dealCart={dealCart}
                                            onRemoveFromDeal={removeFromDeal}
                                            onAddBundle={handleAddBundle}
                                            isComplete={isComplete}
                                        />
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


