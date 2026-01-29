'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { getProductsForBulkEdit, bulkUpdateProducts } from './actions';
import { Timestamp } from 'firebase/firestore';
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
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/utils';


const CONDITION_OPTIONS = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Fair', 'Poor'];
const STATUS_OPTIONS = ['available', 'sold', 'draft'];

export default function BulkEditorPage() {
    const { toast } = useToast();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

    const [newPrice, setNewPrice] = useState<string>('');
    const [newCondition, setNewCondition] = useState<string>('');
    const [newStatus, setNewStatus] = useState<string>('');

    useEffect(() => {
        async function fetchProducts() {
            setLoading(true);
            const fetchedProducts = await getProductsForBulkEdit();
            setProducts(fetchedProducts);
            setLoading(false);
        }
        fetchProducts();
    }, []);

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


    const [isUpdating, setIsUpdating] = useState(false);

    const handleApplyChanges = async () => {
        setIsUpdating(true);
        const updates: any = {};
        if (newPrice) updates.price = parseFloat(newPrice);
        if (newCondition) updates.condition = newCondition;
        if (newStatus) updates.status = newStatus;

        const result = await bulkUpdateProducts(Array.from(selectedProductIds), updates);

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
        setIsUpdating(false);
    };


    const isAllSelected = products.length > 0 && selectedProductIds.size === products.length;
    const isSomeSelected = selectedProductIds.size > 0 && selectedProductIds.size < products.length;

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
                title="Bulk Editor"
                description="Select products to edit their prices, conditions, and statuses in bulk."
            />

            <div className="mt-8">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={isAllSelected || isSomeSelected ? (isAllSelected ? true : "indeterminate") : false}
                                    onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                                    aria-label="Select all"
                                />
                            </TableHead>
                            <TableHead className="w-[80px]">Image</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Condition</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created At</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map((product) => (
                            <TableRow key={product.id} data-state={selectedProductIds.has(product.id) && "selected"}>
                                <TableCell>
                                    <Checkbox
                                        checked={selectedProductIds.has(product.id)}
                                        onCheckedChange={(checked) => handleSelectProduct(product.id, Boolean(checked))}
                                    />
                                </TableCell>
                                <TableCell>
                                    <div className="relative h-16 w-16 overflow-hidden rounded-md">
                                        <Image
                                            src={product.imageUrls[0] || '/placeholder.png'}
                                            alt={product.title}
                                            fill
                                            style={{ objectFit: 'cover' }}
                                        />
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium">{product.title}</TableCell>
                                <TableCell>${formatPrice(product.price)}</TableCell>
                                <TableCell>{product.condition}</TableCell>
                                <TableCell>
                                    <Badge variant={product.status === 'available' ? 'default' : 'outline'}>
                                        {product.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {product.createdAt ? format(product.createdAt instanceof Timestamp ? product.createdAt.toDate() : new Date(product.createdAt), 'PPP') : 'N/A'}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {products.length === 0 && !loading && (
                    <div className="text-center py-12 text-muted-foreground">No products found.</div>
                )}
            </div>

            {selectedProductIds.size > 0 && (
                <div className="mt-8 p-6 border rounded-lg shadow-sm bg-card">
                    <h3 className="text-lg font-semibold mb-4">Actions for {selectedProductIds.size} selected products</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="text-sm font-medium">Price</label>
                            <Input
                                type="number"
                                placeholder="Enter new price"
                                value={newPrice}
                                onChange={(e) => setNewPrice(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Condition</label>
                            <Select value={newCondition} onValueChange={setNewCondition}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select condition" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CONDITION_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Status</label>
                            <Select value={newStatus} onValueChange={setNewStatus}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="mt-6 text-right">
                        <Button onClick={handleApplyChanges}>
                            Apply Changes
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
