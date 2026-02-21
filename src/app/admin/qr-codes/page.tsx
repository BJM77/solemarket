'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase';
import { getActiveProducts } from '@/app/actions/products';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Loader2, QrCode } from 'lucide-react';
import type { Product } from '@/lib/types';
import { useUserPermissions } from '@/hooks/use-user-permissions';

export default function QrCodesPage() {
    const { isSuperAdmin, canSell, isLoading: isPermissionsLoading } = useUserPermissions();
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);

    const hasAccess = isSuperAdmin || canSell;

    useEffect(() => {
        async function fetchProducts() {
            if (hasAccess) {
                // Fetch recent 50 products for now. In a real app, you'd want search/pagination.
                const recentProducts = await getActiveProducts(50);
                setProducts(recentProducts);
            }
            setIsLoading(false);
        }
        fetchProducts();
    }, [hasAccess]);

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        if (selectedIds.size === products.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(products.map(p => p.id)));
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (isPermissionsLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Checking credentials...</div>;
    if (!hasAccess) return <div className="p-8 text-center text-red-500">Access Denied: Admin required.</div>;

    const selectedProducts = products.filter(p => selectedIds.has(p.id));

    return (
        <div className="container mx-auto py-8">
            <div className="print:hidden">
                <div className="flex justify-between items-end mb-8">
                    <PageHeader
                        title="QR Code Generator"
                        description="Select items from inventory to generate printable QR codes for physical cards and slabs."
                    />
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={toggleAll}>
                            {selectedIds.size === products.length ? 'Deselect All' : 'Select All'}
                        </Button>
                        <Button onClick={handlePrint} disabled={selectedIds.size === 0}>
                            <Printer className="mr-2 h-4 w-4" />
                            Print {selectedIds.size} Codes
                        </Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                        {products.map((product) => (
                            <Card
                                key={product.id}
                                className={`cursor-pointer overflow-hidden transition-all ${selectedIds.has(product.id) ? 'ring-2 ring-primary bg-primary/5' : 'hover:border-primary/50'
                                    }`}
                                onClick={() => toggleSelection(product.id)}
                            >
                                <div className="aspect-square relative bg-slate-100">
                                    {product.imageUrls?.[0] ? (
                                        <img src={product.imageUrls[0]} alt={product.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            <QrCode className="h-8 w-8" />
                                        </div>
                                    )}
                                </div>
                                <div className="p-2 text-xs truncate font-medium">
                                    {product.title}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Print View Grid */}
            <div className="hidden print:block">
                <div className="grid grid-cols-4 gap-4" style={{ pageBreakInside: 'avoid' }}>
                    {selectedProducts.map((product) => {
                        const productUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://benched.au'}/product/${product.id}`;
                        return (
                            <div key={product.id} className="flex flex-col items-center justify-center p-4 border border-slate-200" style={{ breakInside: 'avoid' }}>
                                <QRCodeSVG
                                    value={productUrl}
                                    size={120}
                                    level="Q"
                                    includeMargin={true}
                                />
                                <div className="mt-2 text-center w-full">
                                    <h4 className="font-bold text-[10px] leading-tight line-clamp-2">{product.title}</h4>
                                    <p className="text-[8px] text-slate-500 mt-1 uppercase tracking-wider">{product.id.substring(0, 8)}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
