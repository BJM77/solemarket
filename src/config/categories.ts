
import { Category } from '@/lib/types';

export const MARKETPLACE_CATEGORIES: Category[] = [
    {
        id: 'cat_sneakers',
        name: 'Sneakers',
        description: 'Authentic sneakers from top brands',
        slug: 'sneakers',
        imageUrl: '/images/categories/sneakers.jpg',
        section: 'Marketplace',
        order: 1,
        subcategories: [
            { id: 'sub_basketball_sneakers', name: 'Basketball', slug: 'basketball', parentId: 'cat_sneakers' },
            { id: 'sub_men_sneakers', name: 'Men\'s Sneakers', slug: 'mens-sneakers', parentId: 'cat_sneakers' },
            { id: 'sub_women_sneakers', name: 'Women\'s Sneakers', slug: 'womens-sneakers', parentId: 'cat_sneakers' },
            { id: 'sub_youth_sneakers', name: 'Youth (GS)', slug: 'youth-sneakers', parentId: 'cat_sneakers' },
            { id: 'sub_infant_sneakers', name: 'Infant & Toddler', slug: 'infant-sneakers', parentId: 'cat_sneakers' },
        ]
    },
    {
        id: 'cat_cards',
        name: 'Trading Cards',
        description: 'Basketball, Football, and Pokémon cards',
        slug: 'trading-cards',
        imageUrl: '/images/categories/cards.jpg',
        section: 'Marketplace',
        order: 2,
        subcategories: [
            { id: 'sub_basketball_cards', name: 'Basketball Cards', slug: 'basketball-cards', parentId: 'cat_cards' },
            { id: 'sub_football_cards', name: 'Football Cards', slug: 'football-cards', parentId: 'cat_cards' },
            { id: 'sub_other_cards', name: 'Other Cards', slug: 'other-cards', parentId: 'cat_cards' },
        ]
    }
];
