'use client';

import { useEffect, useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { getProductsForBulkEdit } from '../bulk-editor/actions';
import type { Product } from '@/lib/types';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateMinStockQuantity } from './actions';
import { useUser } from '@/firebase';

export default function InventoryAlertsPage() {
    const { toast } = useToast();
    const { user } = useUser();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [thresholds, setThresholds] = useState<{ [key: string]: number | '' }>({});
    const [saving, setSaving] = useState<Set<string>>(new Set());

    useEffect(() => {
        async function fetchProducts() {
            setLoading(true);
            try {
                const fetchedProducts = (await getProductsForBulkEdit()) as Product[];
                setProducts(fetchedProducts || []);
                const initialThresholds = (fetchedProducts || []).reduce((acc, product) => {
                    acc[product.id] = typeof product.minStockQuantity === 'number' ? product.minStockQuantity : 5;
                    return acc;
                }, {} as { [key: string]: number | '' });
                setThresholds(initialThresholds);
            } catch (err: any) {
                toast({
                    title: 'Error loading products',
                    description: err?.message || 'Failed to fetch products.',
                    variant: 'destructive',
                });
            } finally {
                setLoading(false);
            }
        }
        fetchProducts();
    }, [toast]);

    const handleThresholdChange = (productId: string, value: string) => {
        setThresholds(prev => ({
            ...prev,
            [productId]: value === '' ? '' : parseInt(value, 10),
        }));
    };

    const handleSaveThreshold = async (productId: string) => {
        if (!user) {
            toast({
                title: 'Unauthorized',
                description: 'Please sign in with admin privileges.',
                variant: 'destructive',
            });
            return;
        }

        setSaving(prev => new Set(prev).add(productId));
        const threshold = thresholds[productId];

        if (typeof threshold !== 'number' || isNaN(threshold) || threshold < 0) {
            toast({
                title: 'Error',
                description: 'Please enter a valid non-negative number for the threshold.',
                variant: 'destructive',
            });
            setSaving(prev => {
                const next = new Set(prev);
                next.delete(productId);
                return next;
            });
            return;
        }

        try {
            const token = await user.getIdToken();
            const result = await updateMinStockQuantity(token, productId, threshold);

            if (result.success) {
                toast({
                    title: 'Threshold Saved',
                    description: result.message,
                });
            } else {
                toast({
                    title: 'Error',
                    description: result.message,
                    variant: 'destructive',
                });
            }
        } catch (err: any) {
            toast({
                title: 'Error',
                description: err?.message || 'Failed to update threshold.',
                variant: 'destructive',
            });
        } finally {
            setSaving(prev => {
                const next = new Set(prev);
                next.delete(productId);
                return next;
            });
        }
    };

    const filteredProducts = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return products;
        return products.filter(
            p =>
                (p.title && p.title.toLowerCase().includes(query)) ||
                (p.id && p.id.toLowerCase().includes(query))
        );
    }, [products, searchQuery]);

    const lowStockCount = useMemo(() => {
        return products.filter(p => {
            const currentStock = p.quantity ?? 0;
            const threshold = typeof thresholds[p.id] === 'number' ? (thresholds[p.id] as number) : 5;
            return currentStock <= threshold;
        }).length;
    }, [products, thresholds]);

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

            <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search product title or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Low Stock Items:</span>
                    <Badge variant={lowStockCount > 0 ? "destructive" : "secondary"}>
                        {lowStockCount} of {products.length}
                    </Badge>
                </div>
            </div>

            <div className="mt-6 rounded-md border">
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
                        {filteredProducts.map((product) => {
                            const currentStock = product.quantity ?? 0;
                            const threshold = typeof thresholds[product.id] === 'number' ? (thresholds[product.id] as number) : 5;
                            const isLowStock = currentStock <= threshold;

                            return (
                                <TableRow
                                    key={product.id}
                                    className={isLowStock ? 'bg-amber-500/10 hover:bg-amber-500/15' : undefined}
                                >
                                    <TableCell>
                                        <div className="relative h-12 w-12 overflow-hidden rounded-md border bg-muted">
                                            <img
                                                src={product.imageUrls?.[0] || '/wtb-wanted-placeholder.png'}
                                                alt={product.title}
                                                className="h-full w-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = '/wtb-wanted-placeholder.png';
                                                }}
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <span>{product.title}</span>
                                            {isLowStock && (
                                                <Badge variant="destructive" className="flex items-center gap-1 text-[10px] py-0 px-1.5">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    Low
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                                            ID: {product.id}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={isLowStock ? 'font-bold text-destructive' : ''}>
                                            {currentStock}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={thresholds[product.id] ?? ''}
                                            onChange={(e) => handleThresholdChange(product.id, e.target.value)}
                                            className="max-w-[140px]"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            size="sm"
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
                            );
                        })}
                    </TableBody>
                </Table>
                {filteredProducts.length === 0 && !loading && (
                    <div className="text-center py-12 text-muted-foreground">
                        {searchQuery ? 'No matching products found.' : 'No products found.'}
                    </div>
                )}
            </div>
        </div>
    );
}
