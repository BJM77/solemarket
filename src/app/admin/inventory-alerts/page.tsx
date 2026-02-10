'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { getProductsForBulkEdit } from '../bulk-editor/actions'; // Reusing this for now
import type { Product } from '@/lib/types';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateMinStockQuantity } from './actions';

export default function InventoryAlertsPage() {
    const { toast } = useToast();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [thresholds, setThresholds] = useState<{ [key: string]: number | '' }>({});
    const [saving, setSaving] = useState<Set<string>>(new Set());

    useEffect(() => {
        async function fetchProducts() {
            setLoading(true);
            const fetchedProducts = (await getProductsForBulkEdit()) as Product[]; // Reusing the bulk editor action
            setProducts(fetchedProducts as Product[]);
            // Initialize thresholds from existing product data or default to 5
            const initialThresholds = fetchedProducts.reduce((acc, product) => {
                acc[product.id] = product.minStockQuantity || 5;
                return acc;
            }, {} as { [key: string]: number | '' });
            setThresholds(initialThresholds);
            setLoading(false);
        }
        fetchProducts();
    }, []);

    const handleThresholdChange = (productId: string, value: string) => {
        setThresholds(prev => ({
            ...prev,
            [productId]: value === '' ? '' : parseInt(value),
        }));
    };

    const handleSaveThreshold = async (productId: string) => {
        setSaving(prev => new Set(prev).add(productId));
        const threshold = thresholds[productId];

        if (typeof threshold !== 'number' || isNaN(threshold) || threshold < 0) {
            toast({
                title: "Error",
                description: "Please enter a valid non-negative number for the threshold.",
                variant: "destructive",
            });
            setSaving(prev => {
                const newSaving = new Set(prev);
                newSaving.delete(productId);
                return newSaving;
            });
            return;
        }

        const result = await updateMinStockQuantity(productId, threshold);

        if (result.success) {
            toast({
                title: "Threshold Saved",
                description: result.message,
            });
        } else {
            toast({
                title: "Error",
                description: result.message,
                variant: "destructive",
            });
        }
        setSaving(prev => {
            const newSaving = new Set(prev);
            newSaving.delete(productId);
            return newSaving;
        });
    };

    if (loading) {
        return (
            <div className="container mx-auto py-8 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                <p className="mt-4 text-muted-foreground">Loading products...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8">
            <PageHeader
                title="Inventory Alerts"
                description="Manage low stock thresholds and receive notifications for your products."
            />

            <div className="mt-8">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Image</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Current Stock</TableHead>
                            <TableHead className="w-[200px]">Low Stock Threshold</TableHead>
                            <TableHead className="w-[120px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map((product) => (
                            <TableRow key={product.id}>
                                <TableCell>
                                    <div className="relative h-16 w-16 overflow-hidden rounded-md">
                                        <img
                                            src={product.imageUrls?.[0] || '/wtb-wanted-placeholder.png'}
                                            alt={product.title}
                                            className="h-10 w-10 rounded object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = '/wtb-wanted-placeholder.png';
                                            }}
                                        />
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium">{product.title}</TableCell>
                                <TableCell>{product.quantity || 0}</TableCell>
                                <TableCell>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={thresholds[product.id]}
                                        onChange={(e) => handleThresholdChange(product.id, e.target.value)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Button
                                        onClick={() => handleSaveThreshold(product.id)}
                                        disabled={saving.has(product.id)}
                                    >
                                        {saving.has(product.id) ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            'Save'
                                        )}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {products.length === 0 && !loading && (
                    <div className="text-center py-12 text-muted-foreground">No products found.</div>
                )}
            </div>
        </div>
    );
}
