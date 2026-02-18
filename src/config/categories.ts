
import { Category } from '@/lib/types';

export const SNEAKER_CATEGORIES: Category[] = [
    {
        id: 'cat_sneakers',
        name: 'Sneakers',
        description: 'Authentic sneakers from top brands',
        slug: 'sneakers',
        imageUrl: '/images/categories/sneakers.jpg', // Placeholder
        section: 'Marketplace',
        order: 1,
        subcategories: [
            { id: 'sub_basketball', name: 'Basketball', slug: 'basketball', parentId: 'cat_sneakers' },
            { id: 'sub_men_sneakers', name: 'Men\'s Sneakers', slug: 'mens-sneakers', parentId: 'cat_sneakers' },
            { id: 'sub_women_sneakers', name: 'Women\'s Sneakers', slug: 'womens-sneakers', parentId: 'cat_sneakers' },
            { id: 'sub_youth_sneakers', name: 'Youth (GS)', slug: 'youth-sneakers', parentId: 'cat_sneakers' },
            { id: 'sub_infant_sneakers', name: 'Infant & Toddler', slug: 'infant-sneakers', parentId: 'cat_sneakers' },
        ]
    }
];
