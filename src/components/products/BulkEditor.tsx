'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { getProductsForBulkEdit, bulkUpdateProducts } from '@/app/admin/bulk-editor/actions';
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
import { useDoc, useMemoFirebase, useFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

const STATUS_OPTIONS = ['available', 'sold', 'draft'];

interface BulkEditorProps {
    isAdmin?: boolean;
    sellerId?: string;
    title?: string;
    description?: string;
}

export default function BulkEditor({ isAdmin = false, sellerId, title = "Bulk Editor", description = "Manage multiple listings efficiently." }: BulkEditorProps) {
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
    const [isUpdating, setIsUpdating] = useState(false);

    // Bulk action states
    const [newPrice, setNewPrice] = useState<string>('');
    const [newCondition, setNewCondition] = useState<string>('');
    const [newStatus, setNewStatus] = useState<string>('');
    const [newCategory, setNewCategory] = useState<string>('');
    const [newSubCategory, setNewSubCategory] = useState<string>('');

    // Fetch marketplace options using existing hook logic pattern
    const optionsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'marketplace_options') : null, [firestore]);
    const { data: marketplaceOptions } = useDoc<any>(optionsRef);

    const CATEGORIES_OPTIONS: string[] = marketplaceOptions?.categories || ['Collector Cards', 'Coins', 'Collectibles', 'General'];
    const CONDITION_OPTIONS: string[] = marketplaceOptions?.conditions || ['Mint', 'Near Mint', 'Excellent', 'Good', 'Fair', 'Poor'];
    const SUB_CATEGORIES: Record<string, string[]> = {
        'Collector Cards': marketplaceOptions?.subCategories?.collector_cards || ['Sports Cards', 'Trading Cards'],
        'Coins': marketplaceOptions?.subCategories?.coins || ['Coins', 'World Coins', 'Ancient Coins', 'Bullion'],
        'Collectibles': marketplaceOptions?.subCategories?.collectibles || ['Stamps', 'Comics', 'Figurines', 'Toys', 'Shoes', 'Memorabilia'],
        'General': marketplaceOptions?.subCategories?.general || ['Household', 'Electronics', 'Clothing', 'Books', 'Other']
    };

    useEffect(() => {
        async function fetchProducts() {
            setLoading(true);
            try {
                // If not admin and no sellerId provided (shouldn't happen in valid implementation), define behavior.
                // logic handled in action: if sellerId passed, filters by it.
                const fetchedProducts = await getProductsForBulkEdit(sellerId);
                setProducts(fetchedProducts as Product[]);
            } catch (error) {
                console.error("Failed to fetch products", error);
                toast({ title: "Error", description: "Failed to load products", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        }
        fetchProducts();
    }, [toast, sellerId]);

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
            if (newCategory) updates.category = newCategory;
            if (newSubCategory) updates.subCategory = newSubCategory;

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
                const fetchedProducts = await getProductsForBulkEdit(sellerId);
                setProducts(fetchedProducts as Product[]);
                setSelectedProductIds(new Set());
                setNewPrice('');
                setNewCondition('');
                setNewStatus('');
                setNewCategory('');
                setNewSubCategory('');
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
                title={title}
                description={description}
            />

            <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="grid gap-1.5 w-full sm:w-auto">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Category</label>
                        <Select value={newCategory} onValueChange={(val) => { setNewCategory(val); setNewSubCategory(''); }}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORIES_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5 w-full sm:w-auto">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Sub-Category</label>
                        <Select value={newSubCategory} onValueChange={setNewSubCategory} disabled={!newCategory}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Sub-Cat" />
                            </SelectTrigger>
                            <SelectContent>
                                {(SUB_CATEGORIES[newCategory] || []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-1.5 w-full sm:w-auto">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Price</label>
                        <Input
                            type="number"
                            placeholder="Price"
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                            className="w-32"
                        />
                    </div>
                    <div className="grid gap-1.5 w-full sm:w-auto">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Condition</label>
                        <Select value={newCondition} onValueChange={setNewCondition}>
                            <SelectTrigger className="w-32">
                                <SelectValue placeholder="Condition" />
                            </SelectTrigger>
                            <SelectContent>
                                {CONDITION_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5 w-full sm:w-auto">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Status</label>
                        <Select value={newStatus} onValueChange={setNewStatus}>
                            <SelectTrigger className="w-32">
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
                        Apply ({selectedProductIds.size})
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
                            <TableHead>Category / Sub</TableHead>
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
                                <TableCell className="text-sm">
                                    <div className="font-medium">{product.category}</div>
                                    <div className="text-muted-foreground text-xs">{product.subCategory || '-'}</div>
                                </TableCell>
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
                                <TableCell colSpan={8} className="h-24 text-center">
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
