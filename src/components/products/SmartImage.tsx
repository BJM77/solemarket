
'use client';

import React from 'react';
import Image from 'next/image';
import type { Product } from '@/lib/types';
import { cn } from "@/lib/utils/ui";
import { productCoverStyle } from '@/lib/images/focal-point';

interface SmartImageProps {
    product: Product;
    imageIndex?: number;
    className?: string;
    alt?: string;
    sizes?: string;
    priority?: boolean;
    quality?: number;
}

/**
 * SmartImage Component
 * Uses AI Intelligence metadata (Smart Crop) to perfectly frame collectibles.
 * Falls back to standard centering if AI data is missing.
 */
export function SmartImage({
    product,
    imageIndex = 0,
    className,
    alt,
    sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
    priority = false,
    quality = 75
}: SmartImageProps) {
    const [error, setError] = React.useState(false);
    const imageUrl = error ? '/wtb-wanted-placeholder.png' : (product.imageUrls?.[imageIndex] || '/wtb-wanted-placeholder.png');
    const imageAlt = alt || product.imageAltTexts?.[imageIndex] || product.title;

    // Seller-set imageFocalPoints win over AI smartCrop; both default to centre.
    const coverStyle = error ? undefined : productCoverStyle(product, imageIndex);

    return (
        <div className={cn("relative w-full h-full overflow-hidden bg-white dark:bg-neutral-900", className)}>
            {/* Main Product Image — object-cover fills the square; focal point keeps the item in view. */}
            <div className="relative z-10 w-full h-full">
                <Image
                    src={imageUrl}
                    alt={imageAlt}
                    fill
                    priority={priority}
                    fetchPriority={priority ? 'high' : undefined}
                    sizes={sizes}
                    quality={quality}
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    style={coverStyle}
                    onError={() => setError(true)}
                />
            </div>
        </div>
    );
}
