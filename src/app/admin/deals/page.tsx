'use client';

/**
 * Deal Management Dashboard
 */

import { useState, useEffect } from 'react';
import {
    getDeals,
    createDeal,
    updateDeal,
    toggleDealStatus,
    deleteDeal,
    autoClassifyByPrice,
    bulkUpdateTier
} from './actions';
import { Deal, DealRequirements, MultiCardTier } from '@/types/deals';

export default function DealsPage() {
    const [deals, setDeals] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

    useEffect(() => {
        loadDeals();
    }, []);

    async function loadDeals() {
        setLoading(true);
        const data = await getDeals(false);
        setDeals(data);
        setLoading(false);
    }

    async function handleToggleStatus(dealId: string) {
        try {
            await toggleDealStatus(dealId);
            await loadDeals();
        } catch (error) {
            console.error('Error toggling deal:', error);
            alert('Error updating deal status');
        }
    }

    async function handleDelete(dealId: string) {
        if (!confirm('Are you sure you want to delete this deal?')) {
            return;
        }

        try {
            await deleteDeal(dealId);
            await loadDeals();
        } catch (error) {
            console.error('Error deleting deal:', error);
            alert('Error deleting deal');
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">Loading deals...</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Multi-Card Deals</h1>
                    <p className="text-gray-600">Manage promotional bundle deals</p>
                </div>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    + Create New Deal
                </button>
            </div>

            {/* Create/Edit Form Modal */}
            {(showCreateForm || editingDeal) && (
                <DealForm
                    deal={editingDeal}
                    onClose={() => {
                        setShowCreateForm(false);
                        setEditingDeal(null);
                    }}
                    onSave={async () => {
                        await loadDeals();
                        setShowCreateForm(false);
                        setEditingDeal(null);
                    }}
                />
            )}

            {/* Active Deals */}
            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Active Deals ({deals.filter(d => d.isActive).length})</h2>
                <div className="grid gap-4">
                    {deals.filter(d => d.isActive).map(deal => (
                        <DealCard
                            key={deal.id}
                            deal={deal}
                            onToggle={handleToggleStatus}
                            onEdit={setEditingDeal}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            </div>

            {/* Inactive Deals */}
            {deals.filter(d => !d.isActive).length > 0 && (
                <div>
                    <h2 className="text-xl font-semibold mb-4">Inactive Deals ({deals.filter(d => !d.isActive).length})</h2>
                    <div className="grid gap-4">
                        {deals.filter(d => !d.isActive).map(deal => (
                            <DealCard
                                key={deal.id}
                                deal={deal}
                                onToggle={handleToggleStatus}
                                onEdit={setEditingDeal}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function DealCard({
    deal,
    onToggle,
    onEdit,
    onDelete
}: {
    deal: Deal;
    onToggle: (id: string) => void;
    onEdit: (deal: Deal) => void;
    onDelete: (id: string) => void;
}) {
    const totalCards = deal.requirements.base + deal.requirements.premium + deal.requirements.limited;

    return (
        <div className={`bg-white rounded-lg shadow p-6 ${!deal.isActive ? 'opacity-60' : ''}`}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold">{deal.name}</h3>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded font-mono">
                            {deal.code}
                        </span>
                    </div>
                    <p className="text-gray-600">{deal.description}</p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">${deal.price.toFixed(2)}</div>
                    <div className="text-sm text-gray-500">Used {deal.timesUsed} times</div>
                </div>
            </div>

            <div className="flex gap-4 mb-4">
                {deal.requirements.limited > 0 && (
                    <div className="px-3 py-2 bg-purple-100 text-purple-700 rounded">
                        <span className="font-semibold">{deal.requirements.limited}</span> Limited
                    </div>
                )}
                {deal.requirements.premium > 0 && (
                    <div className="px-3 py-2 bg-blue-100 text-blue-700 rounded">
                        <span className="font-semibold">{deal.requirements.premium}</span> Premium
                    </div>
                )}
                {deal.requirements.base > 0 && (
                    <div className="px-3 py-2 bg-gray-100 text-gray-700 rounded">
                        <span className="font-semibold">{deal.requirements.base}</span> Base
                    </div>
                )}
            </div>

            <div className="flex gap-2">
                <button
                    onClick={() => onToggle(deal.id)}
                    className={`px-4 py-2 rounded ${deal.isActive
                            ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                >
                    {deal.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                    onClick={() => onEdit(deal)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Edit
                </button>
                <button
                    onClick={() => onDelete(deal.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    Delete
                </button>
            </div>
        </div>
    );
}

function DealForm({
    deal,
    onClose,
    onSave
}: {
    deal: Deal | null;
    onClose: () => void;
    onSave: () => void;
}) {
    const [formData, setFormData] = useState({
        code: deal?.code || '',
        name: deal?.name || '',
        description: deal?.description || '',
        price: deal?.price || 0,
        base: deal?.requirements.base || 0,
        premium: deal?.requirements.premium || 0,
        limited: deal?.requirements.limited || 0,
        isActive: deal?.isActive ?? true,
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        try {
            const dealData = {
                code: formData.code.toUpperCase(),
                name: formData.name,
                description: formData.description,
                price: formData.price,
                requirements: {
                    base: formData.base,
                    premium: formData.premium,
                    limited: formData.limited,
                },
                isActive: formData.isActive,
                createdBy: 'admin', // TODO: Get from auth
            };

            if (deal) {
                await updateDeal(deal.id, dealData);
            } else {
                await createDeal(dealData);
            }

            onSave();
        } catch (error) {
            console.error('Error saving deal:', error);
            alert('Error saving deal');
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6">
                <h2 className="text-2xl font-bold mb-4">
                    {deal ? 'Edit Deal' : 'Create New Deal'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Deal Code</label>
                        <input
                            type="text"
                            value={formData.code}
                            onChange={e => setFormData({ ...formData, code: e.target.value })}
                            className="w-full px-3 py-2 border rounded"
                            placeholder="STARTER-PACK"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Deal Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border rounded"
                            placeholder="The Collector's Starter Pack"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border rounded"
                            rows={3}
                            placeholder="Perfect for new collectors..."
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Total Price ($)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.price}
                            onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                            className="w-full px-3 py-2 border rounded"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Base Cards</label>
                            <input
                                type="number"
                                value={formData.base}
                                onChange={e => setFormData({ ...formData, base: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border rounded"
                                min="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Premium Cards</label>
                            <input
                                type="number"
                                value={formData.premium}
                                onChange={e => setFormData({ ...formData, premium: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border rounded"
                                min="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Limited Cards</label>
                            <input
                                type="number"
                                value={formData.limited}
                                onChange={e => setFormData({ ...formData, limited: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border rounded"
                                min="0"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isActive"
                            checked={formData.isActive}
                            onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                            className="rounded"
                        />
                        <label htmlFor="isActive" className="text-sm font-medium">Active</label>
                    </div>

                    <div className="flex gap-2 pt-4">
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            {deal ? 'Update Deal' : 'Create Deal'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
