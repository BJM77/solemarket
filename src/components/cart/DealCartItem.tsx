/**
 * Multi-Card Deal Cart Display Component
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
                {deal.requirements.limited > 0 && (
                    <div className={`px-3 py-1 rounded text-sm ${progress.limited === deal.requirements.limited
                            ? 'bg-purple-600 text-white'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                        Limited: {progress.limited}/{deal.requirements.limited}
                    </div>
                )}
                {deal.requirements.premium > 0 && (
                    <div className={`px-3 py-1 rounded text-sm ${progress.premium === deal.requirements.premium
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                        Premium: {progress.premium}/{deal.requirements.premium}
                    </div>
                )}
                {deal.requirements.base > 0 && (
                    <div className={`px-3 py-1 rounded text-sm ${progress.base === deal.requirements.base
                            ? 'bg-gray-600 text-white'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                        Base: {progress.base}/{deal.requirements.base}
                    </div>
                )}
            </div>

            {/* Grouped Items by Tier */}
            <div className="space-y-3 mb-4">
                {/* Limited Cards */}
                {items.filter(i => i.slot === 'limited').length > 0 && (
                    <div>
                        <div className="text-xs font-semibold text-purple-700 mb-2">LIMITED CARDS</div>
                        <div className="space-y-2">
                            {items.filter(i => i.slot === 'limited').map(item => (
                                <DealCartItemRow key={item.productId} item={item} onRemove={onRemoveItem} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Premium Cards */}
                {items.filter(i => i.slot === 'premium').length > 0 && (
                    <div>
                        <div className="text-xs font-semibold text-blue-700 mb-2">PREMIUM CARDS</div>
                        <div className="space-y-2">
                            {items.filter(i => i.slot === 'premium').map(item => (
                                <DealCartItemRow key={item.productId} item={item} onRemove={onRemoveItem} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Base Cards */}
                {items.filter(i => i.slot === 'base').length > 0 && (
                    <div>
                        <div className="text-xs font-semibold text-gray-700 mb-2">BASE CARDS</div>
                        <div className="space-y-2">
                            {items.filter(i => i.slot === 'base').map(item => (
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
                            (deal.requirements.base - progress.base) +
                            (deal.requirements.premium - progress.premium) +
                            (deal.requirements.limited - progress.limited)
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
                src={item.imageUrl || '/placeholder.png'}
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
