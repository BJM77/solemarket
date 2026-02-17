
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
            { id: 'sub_men_sneakers', name: 'Men\'s Sneakers', slug: 'mens-sneakers', parentId: 'cat_sneakers' },
            { id: 'sub_women_sneakers', name: 'Women\'s Sneakers', slug: 'womens-sneakers', parentId: 'cat_sneakers' },
            { id: 'sub_youth_sneakers', name: 'Youth (GS)', slug: 'youth-sneakers', parentId: 'cat_sneakers' },
            { id: 'sub_infant_sneakers', name: 'Infant & Toddler', slug: 'infant-sneakers', parentId: 'cat_sneakers' },
        ]
    },
    {
        id: 'cat_accessories',
        name: 'Accessories',
        description: 'Socks, hats, and sneaker care',
        slug: 'accessories',
        imageUrl: '/images/categories/accessories.jpg', // Placeholder
        section: 'Marketplace',
        order: 3,
        subcategories: [
            { id: 'sub_bags', name: 'Bags', slug: 'bags', parentId: 'cat_accessories' },
            { id: 'sub_hats', name: 'Hats & Beanies', slug: 'hats', parentId: 'cat_accessories' },
            { id: 'sub_socks', name: 'Socks', slug: 'socks', parentId: 'cat_accessories' },
            { id: 'sub_care', name: 'Sneaker Care', slug: 'sneaker-care', parentId: 'cat_accessories' },
        ]
    }
];
