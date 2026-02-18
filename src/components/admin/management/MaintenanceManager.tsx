'use client';

import { useState } from 'react';
import NextImage from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Search, AlertTriangle } from 'lucide-react';
import { deleteProductByAdmin } from '@/app/actions/admin';
import { getProducts } from '@/services/product-service';
import { Product } from '@/lib/types';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';

export default function MaintenanceManager() {
    const [searchTerm, setSearchTerm] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const { toast } = useToast();

    const handleSearch = async () => {
        if (!searchTerm.trim()) return;
        setIsSearching(true);
        try {
            // Fetch products matching the search term
            const result = await getProducts({ q: searchTerm, page: 1, limit: 50 });
            setProducts(result.products);

            if (result.products.length === 0) {
                toast({
                    title: "No products found",
                    description: `No active products found matching "${searchTerm}".`,
                });
            }
        } catch (error) {
            console.error("Search error:", error);
            toast({
                variant: "destructive",
                title: "Search Failed",
                description: "Could not fetch products.",
            });
        } finally {
            setIsSearching(false);
        }
    };

    const handleDelete = async (productId: string, productTitle: string) => {
        if (!confirm(`Are you sure you want to FORCE DELETE "${productTitle}"?\nThis action cannot be undone.`)) {
            return;
        }

        setDeletingId(productId);
        try {
            const idToken = await getCurrentUserIdToken();
            if (!idToken) throw new Error("Not authenticated");

            const result = await deleteProductByAdmin(productId, idToken);

            if (result.success) {
                toast({
                    title: "Product Deleted",
                    description: result.message,
                });
                // Remove from list
                setProducts(prev => prev.filter(p => p.id !== productId));
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Deletion Failed",
                description: error.message,
            });
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Force Delete Products
                </CardTitle>
                <CardDescription>
                    Search for specific listings (e.g., "Fix Test", "Jordan") and permanently remove them from the database.
                    This tool bypasses standard checks and is intended for cleanup.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-4 mb-6">
                    <Input
                        placeholder="Enter product title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch} disabled={isSearching || !searchTerm.trim()}>
                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                        Find
                    </Button>
                </div>

                <div className="space-y-2">
                    {products.length > 0 && (
                        <div className="text-sm text-muted-foreground mb-2">Found {products.length} matching products:</div>
                    )}

                    {products.map(product => (
                        <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                            <div className="flex items-center gap-3">
                                {product.imageUrls && product.imageUrls[0] && (
                                    <div className="h-10 w-10 relative rounded overflow-hidden bg-muted">
                                        <NextImage src={product.imageUrls[0]} alt="" fill className="object-cover" />
                                    </div>
                                )}
                                <div>
                                    <div className="font-bold">{product.title}</div>
                                    <div className="text-xs text-muted-foreground">ID: {product.id} | Price: ${product.price}</div>
                                </div>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(product.id, product.title)}
                                disabled={deletingId === product.id}
                            >
                                {deletingId === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                Delete
                            </Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
