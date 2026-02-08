'use client';

/**
 * Priget - Price Intelligence Dashboard
 */

import { useState, useEffect } from 'react';
import {
    getPrigetProducts,
    batchGetMarketData,
    updateProductPrice,
    bulkUpdateToSuggested
} from './actions';
import { calculatePriceFlag } from '@/lib/priget-utils';
import { BatchProcessResult } from '@/types/priget';

interface Product {
    id: string;
    title: string;
    price: number;
    imageUrl?: string;
    marketData?: {
        averageSoldPrice: number;
        lastSoldDate: string;
        suggestedPrice: number;
        sampleSize: number;
    };
}

export default function PrigetPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    useEffect(() => {
        loadProducts();
    }, []);

    async function loadProducts() {
        setLoading(true);
        const data = await getPrigetProducts(100);
        setProducts(data as Product[]);
        setLoading(false);
    }

    async function handleGetPrices() {
        if (selectedIds.size === 0) {
            alert('Please select products first');
            return;
        }

        setProcessing(true);
        setProgress({ current: 0, total: selectedIds.size });

        const ids = Array.from(selectedIds);

        try {
            // Process in batches with progress updates
            const batchSize = 5;
            for (let i = 0; i < ids.length; i += batchSize) {
                const batch = ids.slice(i, i + batchSize);
                await batchGetMarketData(batch);
                setProgress({ current: Math.min(i + batchSize, ids.length), total: ids.length });
            }

            // Reload products to show updated data
            await loadProducts();
            setSelectedIds(new Set());
            alert('Market data updated successfully!');
        } catch (error) {
            console.error('Error fetching prices:', error);
            alert('Error fetching prices. Check console for details.');
        } finally {
            setProcessing(false);
            setProgress({ current: 0, total: 0 });
        }
    }

    async function handleMatchPrice(productId: string, suggestedPrice: number) {
        try {
            await updateProductPrice(productId, suggestedPrice);
            await loadProducts();
        } catch (error) {
            console.error('Error updating price:', error);
            alert('Error updating price');
        }
    }

    async function handleBulkUpdate() {
        if (selectedIds.size === 0) {
            alert('Please select products first');
            return;
        }

        if (!confirm(`Update ${selectedIds.size} products to suggested prices?`)) {
            return;
        }

        setProcessing(true);
        try {
            const count = await bulkUpdateToSuggested(Array.from(selectedIds));
            await loadProducts();
            setSelectedIds(new Set());
            alert(`Updated ${count} products successfully!`);
        } catch (error) {
            console.error('Error bulk updating:', error);
            alert('Error updating prices');
        } finally {
            setProcessing(false);
        }
    }

    function toggleSelection(id: string) {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    }

    function toggleSelectAll() {
        if (selectedIds.size === products.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(products.map(p => p.id)));
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">Loading products...</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Priget - Price Intelligence</h1>
                <p className="text-gray-600">Compare your prices against eBay sold data</p>
            </div>

            {/* Actions Bar */}
            <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-4 items-center">
                <button
                    onClick={handleGetPrices}
                    disabled={processing || selectedIds.size === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                    {processing ? `Processing ${progress.current}/${progress.total}...` : `Get Prices (${selectedIds.size})`}
                </button>

                <button
                    onClick={handleBulkUpdate}
                    disabled={processing || selectedIds.size === 0}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                >
                    Update All to Suggested
                </button>

                <div className="ml-auto text-sm text-gray-600">
                    {selectedIds.size} of {products.length} selected
                </div>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.size === products.length && products.length > 0}
                                    onChange={toggleSelectAll}
                                    className="rounded"
                                />
                            </th>
                            <th className="px-4 py-3 text-left">Product</th>
                            <th className="px-4 py-3 text-left">Current Price</th>
                            <th className="px-4 py-3 text-left">eBay Avg</th>
                            <th className="px-4 py-3 text-left">Last Sold</th>
                            <th className="px-4 py-3 text-left">Diff</th>
                            <th className="px-4 py-3 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {products.map(product => {
                            const priceFlag = product.marketData
                                ? calculatePriceFlag(product.price, product.marketData.averageSoldPrice)
                                : null;

                            return (
                                <tr key={product.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(product.id)}
                                            onChange={() => toggleSelection(product.id)}
                                            className="rounded"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {product.imageUrl && (
                                                <img
                                                    src={product.imageUrl}
                                                    alt={product.title}
                                                    className="w-12 h-12 object-cover rounded"
                                                />
                                            )}
                                            <div className="max-w-xs truncate">{product.title}</div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-semibold">${product.price.toFixed(2)}</td>
                                    <td className="px-4 py-3">
                                        {product.marketData ? (
                                            <div>
                                                <div className="font-semibold">${product.marketData.averageSoldPrice.toFixed(2)}</div>
                                                <div className="text-xs text-gray-500">({product.marketData.sampleSize} sold)</div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                        {product.marketData
                                            ? new Date(product.marketData.lastSoldDate).toLocaleDateString()
                                            : '-'
                                        }
                                    </td>
                                    <td className="px-4 py-3">
                                        {priceFlag && (
                                            <span className={`
                        px-2 py-1 rounded text-sm font-medium
                        ${priceFlag.status === 'overpriced' ? 'bg-red-100 text-red-700' : ''}
                        ${priceFlag.status === 'underpriced' ? 'bg-green-100 text-green-700' : ''}
                        ${priceFlag.status === 'competitive' ? 'bg-blue-100 text-blue-700' : ''}
                      `}>
                                                {priceFlag.percentage > 0 ? '+' : ''}{priceFlag.percentage}%
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {product.marketData && (
                                            <button
                                                onClick={() => handleMatchPrice(product.id, product.marketData!.suggestedPrice)}
                                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                                            >
                                                Match ${product.marketData.suggestedPrice.toFixed(2)}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
