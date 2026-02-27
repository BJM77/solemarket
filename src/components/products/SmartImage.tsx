
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
    priority = false
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
        <div className={cn("relative w-full h-full overflow-hidden", className)}>
            <Image
                src={imageUrl}
                alt={imageAlt}
                fill
                priority={priority}
                sizes={sizes}
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                style={{ objectPosition }}
                onError={() => setError(true)}
                placeholder="blur"
                blurDataURL="data:image/webp;base64,UklGRloAAABXRUJQVlA4IE4AAADQAQCdASoIAAgAAUAmJaQAA3AA/v79ggAA"
            />
        </div>
    );
}
