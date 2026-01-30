"use client";

import { useEffect, useState } from "react";
import { Product } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Trash2, Eye, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUserIdToken } from "@/lib/firebase/auth";
import { deleteProductByAdmin, approveProductByAdmin } from "@/app/actions/admin";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";

interface SellerProductsListProps {
    products: Product[];
    refresh: () => void;
}

export function SellerProductsList({ products, refresh }: SellerProductsListProps) {
    const { toast } = useToast();
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

    const handleAction = async (id: string, action: 'approve' | 'delete') => {
        setLoadingIds(prev => new Set(prev).add(id));
        try {
            const idToken = await getCurrentUserIdToken();
            if (!idToken) throw new Error("Auth required");

            let result;
            if (action === 'approve') {
                result = await approveProductByAdmin(id, idToken);
            } else {
                result = await deleteProductByAdmin(id, idToken);
            }

            if (result.success) {
                toast({ title: "Success", description: result.message });
                refresh();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setLoadingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Listed Products ({products.length})</h3>
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Image</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                    No products found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            products.map((product) => (
                                <TableRow key={product.id}>
                                    <TableCell>
                                        <div className="relative h-12 w-12 rounded overflow-hidden bg-muted">
                                            {product.imageUrls?.[0] && (
                                                <Image src={product.imageUrls[0]} alt={product.title} fill className="object-cover" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span>{product.title}</span>
                                            <span className="text-xs text-muted-foreground">{product.id}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>${formatPrice(product.price)}</TableCell>
                                    <TableCell>
                                        <Badge variant={product.status === 'available' ? 'default' : product.status === 'pending_approval' ? 'secondary' : 'outline'}>
                                            {product.status || 'Unknown'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {product.status === 'pending_approval' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                                                    onClick={() => handleAction(product.id, 'approve')}
                                                    disabled={loadingIds.has(product.id)}
                                                >
                                                    {loadingIds.has(product.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleAction(product.id, 'delete')}
                                                disabled={loadingIds.has(product.id)}
                                            >
                                                {loadingIds.has(product.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
