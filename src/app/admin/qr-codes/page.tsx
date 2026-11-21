'use client';

import { useState, useEffect, useMemo } from 'react';
import { getActiveProducts } from '@/app/actions/marketplace/products';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Loader2, QrCode, Search } from 'lucide-react';
import type { Product } from '@/lib/types';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { getProductUrl } from '@/lib/utils/url';

export default function QrCodesPage() {
    const { isSuperAdmin, canSell, isLoading: isPermissionsLoading } = useUserPermissions();
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const hasAccess = isSuperAdmin || canSell;

    useEffect(() => {
        async function fetchProducts() {
            if (hasAccess) {
                // Fetch recent 100 products
                const recentProducts = await getActiveProducts(100);
                setProducts(recentProducts || []);
            }
            setIsLoading(false);
        }
        fetchProducts();
    }, [hasAccess]);

    const filteredProducts = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return products;
        return products.filter(
            p =>
                (p.title && p.title.toLowerCase().includes(query)) ||
                (p.id && p.id.toLowerCase().includes(query))
        );
    }, [products, searchQuery]);

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleAllFiltered = () => {
        const allFilteredSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedIds.has(p.id));
        const newSet = new Set(selectedIds);
        if (allFilteredSelected) {
            filteredProducts.forEach(p => newSet.delete(p.id));
        } else {
            filteredProducts.forEach(p => newSet.add(p.id));
        }
        setSelectedIds(newSet);
    };

    const handlePrint = () => {
        window.print();
    };

    if (isPermissionsLoading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Checking credentials...</div>;
    }
    if (!hasAccess) {
        return <div className="p-8 text-center text-red-500">Access Denied: Admin or Seller access required.</div>;
    }

    const selectedProducts = products.filter(p => selectedIds.has(p.id));
    const allFilteredSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedIds.has(p.id));

    return (
        <div className="container mx-auto py-8">
            <div className="print:hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                    <PageHeader
                        title="QR Code Generator"
                        description="Select items from inventory to generate printable QR codes for physical cards, slabs, and merchandise."
                    />
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" onClick={toggleAllFiltered}>
                            {allFilteredSelected ? 'Deselect Visible' : 'Select Visible'}
                        </Button>
                        <Button size="sm" onClick={handlePrint} disabled={selectedIds.size === 0}>
                            <Printer className="mr-2 h-4 w-4" />
                            Print {selectedIds.size} Codes
                        </Button>
                    </div>
                </div>

                <div className="mb-6 max-w-sm relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search products by title or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                            {filteredProducts.map((product) => {
                                const isSelected = selectedIds.has(product.id);
                                return (
                                    <Card
                                        key={product.id}
                                        className={`cursor-pointer overflow-hidden transition-all ${
                                            isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:border-primary/50'
                                        }`}
                                        onClick={() => toggleSelection(product.id)}
                                    >
                                        <div className="aspect-square relative bg-slate-100 dark:bg-slate-800">
                                            {product.imageUrls?.[0] ? (
                                                <img
                                                    src={product.imageUrls[0]}
                                                    alt={product.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-foreground/80">
                                                    <QrCode className="h-8 w-8" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-2">
                                            <div className="text-xs truncate font-medium">
                                                {product.title}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground font-mono truncate">
                                                ${product.price}
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                        {filteredProducts.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                                {searchQuery ? 'No products match your search.' : 'No active products found.'}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Print View Grid */}
            <div className="hidden print:block">
                <div className="grid grid-cols-4 gap-4" style={{ pageBreakInside: 'avoid' }}>
                    {selectedProducts.map((product) => {
                        const path = getProductUrl({
                            id: product.id,
                            title: product.title,
                            category: product.category,
                            subCategory: product.subCategory,
                            storefrontId: (product as any).storefrontId,
                            brand: product.brand,
                            size: product.size != null ? String(product.size) : undefined,
                        });
                        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://benched.au';
                        const productUrl = `${siteUrl}${path}`;

                        return (
                            <div
                                key={product.id}
                                className="flex flex-col items-center justify-center p-4 border border-slate-200"
                                style={{ breakInside: 'avoid' }}
                            >
                                <QRCodeSVG
                                    value={productUrl}
                                    size={120}
                                    level="Q"
                                    includeMargin={true}
                                />
                                <div className="mt-2 text-center w-full">
                                    <h4 className="font-bold text-[10px] leading-tight line-clamp-2">{product.title}</h4>
                                    <p className="text-[8px] text-slate-500 mt-1 uppercase tracking-wider">{product.id.substring(0, 8)}</p>
                                    <p className="text-[9px] font-semibold mt-0.5">${Number(product.price || 0).toFixed(2)}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
