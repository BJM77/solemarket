'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { getProductsForBulkEdit, bulkUpdateProducts } from './actions';
import type { Product } from '@/lib/types';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { safeDate } from '@/lib/date-utils';

const CONDITION_OPTIONS = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Fair', 'Poor'];
const STATUS_OPTIONS = ['available', 'sold', 'draft'];

export default function BulkEditorPage() {
    const { toast } = useToast();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
    const [isUpdating, setIsUpdating] = useState(false);

    // Bulk action states
    const [newPrice, setNewPrice] = useState<string>('');
    const [newCondition, setNewCondition] = useState<string>('');
    const [newStatus, setNewStatus] = useState<string>('');

    useEffect(() => {
        async function fetchProducts() {
            setLoading(true);
            try {
                const fetchedProducts = await getProductsForBulkEdit();
                setProducts(fetchedProducts);
            } catch (error) {
                console.error("Failed to fetch products", error);
                toast({ title: "Error", description: "Failed to load products", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        }
        fetchProducts();
    }, [toast]);

    const handleSelectProduct = (productId: string, isSelected: boolean) => {
        setSelectedProductIds(prev => {
            const newSelection = new Set(prev);
            if (isSelected) {
                newSelection.add(productId);
            } else {
                newSelection.delete(productId);
            }
            return newSelection;
        });
    };

    const handleSelectAll = (isSelected: boolean) => {
        if (isSelected) {
            const allProductIds = new Set(products.map(p => p.id));
            setSelectedProductIds(allProductIds);
        } else {
            setSelectedProductIds(new Set());
        }
    };

    const handleApplyChanges = async () => {
        if (selectedProductIds.size === 0) return;

        setIsUpdating(true);
        try {
            const idToken = await getCurrentUserIdToken();
            if (!idToken) {
                toast({ title: "Auth Error", description: "Please sign in again.", variant: "destructive" });
                return;
            }

            const updates: any = {};
            if (newPrice) updates.price = parseFloat(newPrice);
            if (newCondition) updates.condition = newCondition;
            if (newStatus) updates.status = newStatus;

            if (Object.keys(updates).length === 0) {
                toast({ title: "No changes", description: "Select at least one field to update." });
                return;
            }

            const result = await bulkUpdateProducts(Array.from(selectedProductIds), updates, idToken);

            if (result.success) {
                toast({
                    title: "Success",
                    description: result.message,
                });
                // Refetch products
                const fetchedProducts = await getProductsForBulkEdit();
                setProducts(fetchedProducts);
                setSelectedProductIds(new Set());
                setNewPrice('');
                setNewCondition('');
                setNewStatus('');
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result.message,
                });
            }
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Failed to update.", variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    if (loading) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;
    }

    return (
        <div className="container py-8 space-y-6">
            <PageHeader
                title="Bulk Editor"
                description="Manage multiple listings efficiently."
            />

            <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="grid gap-1.5 w-full sm:w-auto">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Set Price</label>
                        <Input
                            type="number"
                            placeholder="New Price"
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                            className="w-32"
                        />
                    </div>
                    <div className="grid gap-1.5 w-full sm:w-auto">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Set Condition</label>
                        <Select value={newCondition} onValueChange={setNewCondition}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Condition" />
                            </SelectTrigger>
                            <SelectContent>
                                {CONDITION_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5 w-full sm:w-auto">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Set Status</label>
                        <Select value={newStatus} onValueChange={setNewStatus}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        onClick={handleApplyChanges}
                        disabled={isUpdating || selectedProductIds.size === 0}
                        className="mb-0.5"
                    >
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Apply to {selectedProductIds.size} Selected
                    </Button>
                </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">
                                <Checkbox
                                    checked={products.length > 0 && selectedProductIds.size === products.length}
                                    onCheckedChange={handleSelectAll}
                                />
                            </TableHead>
                            <TableHead className="w-16">Image</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Condition</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map((product) => (
                            <TableRow key={product.id}>
                                <TableCell>
                                    <Checkbox
                                        checked={selectedProductIds.has(product.id)}
                                        onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <div className="relative w-10 h-10 rounded overflow-hidden bg-gray-100">
                                        {product.imageUrls?.[0] && (
                                            <Image
                                                src={product.imageUrls[0]}
                                                alt={product.title}
                                                fill
                                                className="object-cover"
                                            />
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium max-w-xs truncate">{product.title}</TableCell>
                                <TableCell>${formatPrice(product.price)}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">{product.condition}</Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={product.status === 'available' ? 'default' : 'secondary'}>
                                        {product.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                    {product.createdAt ? format(safeDate(product.createdAt), 'PPP') : 'N/A'}
                                </TableCell>
                            </TableRow>
                        ))}
                        {products.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    No products found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
