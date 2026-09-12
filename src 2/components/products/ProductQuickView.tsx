'use client';

import { formatPrice } from '@/lib/utils';
import type { Product } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import ProductImageGallery from '@/components/products/ProductImageGallery';
import { Calendar, Copyright, Hash } from 'lucide-react';

interface ProductQuickViewProps {
    product: Product;
}

export default function ProductQuickView({ product }: ProductQuickViewProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start p-1">
            <div className="space-y-4">
                <ProductImageGallery
                    images={product.imageUrls}
                    title={product.title}
                    isCard={product.category === 'Collector Cards'}
                    category={product.category}
                    condition={product.condition}
                />
            </div>

            <div className="space-y-6">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs">
                            {product.category} {product.subCategory && `> ${product.subCategory}`}
                        </Badge>
                        <Badge variant={product.status === 'sold' ? 'secondary' : 'default'}>
                            {product.status || 'Active'}
                        </Badge>
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 mb-3">{product.title}</h1>

                    <div className="flex items-center gap-3 mb-4">
                        <div className="text-3xl font-bold text-gray-900">
                            ${formatPrice(product.price)}
                        </div>
                    </div>

                    <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                        {product.year && (
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                <span>Year: {product.year}</span>
                            </div>
                        )}
                        {product.manufacturer && (
                            <div className="flex items-center gap-1.5">
                                <Copyright className="w-4 h-4" />
                                <span>{product.manufacturer}</span>
                            </div>
                        )}
                        {product.cardNumber && (
                            <div className="flex items-center gap-1.5">
                                <Hash className="w-4 h-4" />
                                <span>#{product.cardNumber}</span>
                            </div>
                        )}
                    </div>

                    <div className="prose prose-sm max-w-none text-gray-600 mt-4">
                        <p className="whitespace-pre-line">{product.description}</p>
                    </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                    <h3 className="font-semibold text-sm">Specifications</h3>
                    <dl className="grid grid-cols-2 gap-y-2 text-sm">
                        <dt className="text-muted-foreground">Condition</dt>
                        <dd className="font-medium">{product.condition}</dd>

                        {product.gradingCompany && product.gradingCompany !== 'Raw' && (
                            <>
                                <dt className="text-muted-foreground">Grading</dt>
                                <dd className="font-medium">{product.gradingCompany} {product.grade}</dd>
                            </>
                        )}

                        {product.certNumber && (
                            <>
                                <dt className="text-muted-foreground">Cert #</dt>
                                <dd className="font-medium">{product.certNumber}</dd>
                            </>
                        )}
                    </dl>
                </div>
            </div>
        </div>
    );
}
