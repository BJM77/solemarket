
'use client';

import React from 'react';
import Image from 'next/image';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

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
    const intelligence = product.aiIntelligence?.[imageIndex];
    const imageAlt = alt || product.imageAltTexts?.[imageIndex] || product.title;

    // Default object-position is center
    let objectPosition = 'center';

    // If AI Smart Crop data exists, calculate the CSS object-position
    // Note: CSS object-position uses the center point of the focus area.
    if (intelligence?.smartCrop && !error) {
        const { x, y } = intelligence.smartCrop;
        // x and y are 0-1 relative coordinates from AI
        objectPosition = `${x * 100}% ${y * 100}%`;
    }

    return (
        <div className={cn("relative w-full h-full overflow-hidden bg-muted/20", className)}>
            {/* Premium Blurred Backdrop (only for non-square matches) */}
            <div className="absolute inset-0 z-0">
                <Image
                    src={imageUrl}
                    alt=""
                    fill
                    className="object-cover blur-2xl opacity-40 scale-125 saturate-150"
                    priority={priority}
                />
            </div>

            {/* Main Product Image (Protected with object-contain) */}
            <div className="relative z-10 w-full h-full p-1 sm:p-2">
                <Image
                    src={imageUrl}
                    alt={imageAlt}
                    fill
                    priority={priority}
                    sizes={sizes}
                    quality={quality}
                    className="object-contain transition-transform duration-500 group-hover:scale-110 drop-shadow-md"
                    style={{ objectPosition }}
                    onError={() => setError(true)}
                />
            </div>
        </div>
    );
}
