/**
 * Multi-Listing Deal Cart Display Component
 * Shows how deal bundles appear in the shopping cart
 */

import { Deal, DealGroup } from '@/types/deals';

interface DealCartItemProps {
    dealGroup: DealGroup;
    onRemoveItem: (productId: string) => void;
    onRemoveDeal: (dealId: string) => void;
}

export function DealCartItem({ dealGroup, onRemoveItem, onRemoveDeal }: DealCartItemProps) {
    const { deal, items, isComplete, progress, totalPrice } = dealGroup;

    // Calculate original price (sum of individual items)
    const originalPrice = items.reduce((sum, item) => sum + item.price, 0);
    const savings = originalPrice - deal.price;

    return (
        <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50">
            {/* Deal Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg">{deal.name}</h3>
                        <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded font-semibold">
                            BUNDLE DEAL
                        </span>
                        {isComplete && (
                            <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded">
                                ✓ Complete
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-600">{deal.description}</p>
                </div>
                <button
                    onClick={() => onRemoveDeal(deal.id)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                    Remove Bundle
                </button>
            </div>

            {/* Progress Indicators */}
            <div className="flex gap-3 mb-4">
                {deal.requirements.platinum > 0 && (
                    <div className={`px-3 py-1 rounded text-sm ${progress.platinum === deal.requirements.platinum
                        ? 'bg-neutral-900 text-white border border-neutral-700'
                        : 'bg-white text-neutral-900 border border-neutral-300'
                        }`}>
                        Platinum: {progress.platinum}/{deal.requirements.platinum}
                    </div>
                )}
                {deal.requirements.gold > 0 && (
                    <div className={`px-3 py-1 rounded text-sm ${progress.gold === deal.requirements.gold
                        ? 'bg-yellow-500 text-white'
                        : 'bg-yellow-100 text-yellow-800'
                        }`}>
                        Gold: {progress.gold}/{deal.requirements.gold}
                    </div>
                )}
                {deal.requirements.silver > 0 && (
                    <div className={`px-3 py-1 rounded text-sm ${progress.silver === deal.requirements.silver
                        ? 'bg-slate-500 text-white'
                        : 'bg-slate-100 text-slate-700'
                        }`}>
                        Silver: {progress.silver}/{deal.requirements.silver}
                    </div>
                )}
                {deal.requirements.bronze > 0 && (
                    <div className={`px-3 py-1 rounded text-sm ${progress.bronze === deal.requirements.bronze
                        ? 'bg-orange-600 text-white'
                        : 'bg-orange-100 text-orange-800'
                        }`}>
                        Bronze: {progress.bronze}/{deal.requirements.bronze}
                    </div>
                )}
            </div>

            {/* Grouped Items by Tier */}
            <div className="space-y-3 mb-4">
                {/* Platinum Cards */}
                {items.filter(i => i.slot === 'platinum').length > 0 && (
                    <div>
                        <div className="text-xs font-semibold text-neutral-800 mb-2">PLATINUM CARDS</div>
                        <div className="space-y-2">
                            {items.filter(i => i.slot === 'platinum').map(item => (
                                <DealCartItemRow key={item.productId} item={item} onRemove={onRemoveItem} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Gold Cards */}
                {items.filter(i => i.slot === 'gold').length > 0 && (
                    <div>
                        <div className="text-xs font-semibold text-yellow-700 mb-2">GOLD CARDS</div>
                        <div className="space-y-2">
                            {items.filter(i => i.slot === 'gold').map(item => (
                                <DealCartItemRow key={item.productId} item={item} onRemove={onRemoveItem} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Silver Cards */}
                {items.filter(i => i.slot === 'silver').length > 0 && (
                    <div>
                        <div className="text-xs font-semibold text-slate-700 mb-2">SILVER CARDS</div>
                        <div className="space-y-2">
                            {items.filter(i => i.slot === 'silver').map(item => (
                                <DealCartItemRow key={item.productId} item={item} onRemove={onRemoveItem} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Bronze Cards */}
                {items.filter(i => i.slot === 'bronze').length > 0 && (
                    <div>
                        <div className="text-xs font-semibold text-orange-800 mb-2">BRONZE CARDS</div>
                        <div className="space-y-2">
                            {items.filter(i => i.slot === 'bronze').map(item => (
                                <DealCartItemRow key={item.productId} item={item} onRemove={onRemoveItem} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Pricing Summary */}
            <div className="border-t pt-3">
                {!isComplete && (
                    <div className="text-sm text-amber-700 bg-amber-50 p-2 rounded mb-2">
                        ⚠️ Bundle incomplete - Add {
                            (deal.requirements.bronze - progress.bronze) +
                            (deal.requirements.silver - progress.silver) +
                            (deal.requirements.gold - progress.gold) +
                            (deal.requirements.platinum - progress.platinum)
                        } more card(s) to unlock bundle price
                    </div>
                )}

                <div className="flex justify-between items-center">
                    <div>
                        {isComplete && (
                            <div className="text-sm text-gray-500">
                                <span className="line-through">${originalPrice.toFixed(2)}</span>
                                <span className="ml-2 text-green-600 font-semibold">
                                    Save ${savings.toFixed(2)}!
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="text-right">
                        <div className={`text-2xl font-bold ${isComplete ? 'text-green-600' : 'text-gray-900'}`}>
                            ${totalPrice.toFixed(2)}
                        </div>
                        {isComplete && (
                            <div className="text-xs text-green-600 font-semibold">Bundle Price Applied</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function DealCartItemRow({
    item,
    onRemove
}: {
    item: any;
    onRemove: (productId: string) => void;
}) {
    return (
        <div className="flex items-center gap-3 bg-white p-2 rounded">
            <img
                src={item.imageUrl || '/wtb-wanted-placeholder.png'}
                alt={item.title}
                className="w-12 h-12 object-cover rounded"
            />
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.title}</div>
                <div className="text-xs text-gray-500">${item.price.toFixed(2)}</div>
            </div>
            <button
                onClick={() => onRemove(item.productId)}
                className="text-gray-400 hover:text-red-600 text-sm"
            >
                ×
            </button>
        </div>
    );
}

/**
 * Example usage in cart page:
 * 
 * ```tsx
 * import { DealCartItem } from '@/components/cart/DealCartItem';
 * 
 * function CartPage() {
 *   const dealGroups = calculateDealGroups(cartItems);
 *   
 *   return (
 *     <div>
 *       {dealGroups.map(group => (
 *         <DealCartItem
 *           key={group.dealId}
 *           dealGroup={group}
 *           onRemoveItem={removeItemFromCart}
 *           onRemoveDeal={removeEntireDeal}
 *         />
 *       ))}
 *       
 *       {regularItems.map(item => (
 *         <RegularCartItem key={item.id} item={item} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
