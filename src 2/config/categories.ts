
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
            { id: 'sub_jordan_sneakers', name: 'Jordan', slug: 'jordan', parentId: 'cat_sneakers' },
            { id: 'sub_kobe_sneakers', name: 'Kobe', slug: 'kobe', parentId: 'cat_sneakers' },
            { id: 'sub_lebron_sneakers', name: 'LeBron', slug: 'lebron', parentId: 'cat_sneakers' },
            { id: 'sub_curry_sneakers', name: 'Curry', slug: 'curry', parentId: 'cat_sneakers' },
            { id: 'sub_nike_sneakers', name: 'Nike', slug: 'nike', parentId: 'cat_sneakers' },
            { id: 'sub_adidas_sneakers', name: 'Adidas', slug: 'adidas', parentId: 'cat_sneakers' },
            { id: 'sub_yeezy_sneakers', name: 'Yeezy', slug: 'yeezy', parentId: 'cat_sneakers' },
            { id: 'sub_nb_sneakers', name: 'New Balance', slug: 'new-balance', parentId: 'cat_sneakers' },
            { id: 'sub_ua_sneakers', name: 'Under Armour', slug: 'under-armour', parentId: 'cat_sneakers' },
            { id: 'sub_reebok_sneakers', name: 'Reebok', slug: 'reebok', parentId: 'cat_sneakers' },
            { id: 'sub_puma_sneakers', name: 'Puma', slug: 'puma', parentId: 'cat_sneakers' },
            { id: 'sub_converse_sneakers', name: 'Converse', slug: 'converse', parentId: 'cat_sneakers' },
            { id: 'sub_limited_sneakers', name: 'Limited', slug: 'limited', parentId: 'cat_sneakers' },
            { id: 'sub_vintage_sneakers', name: 'Vintage', slug: 'vintage', parentId: 'cat_sneakers' },
            { id: 'sub_basketball_sneakers', name: 'Basketball', slug: 'basketball', parentId: 'cat_sneakers' },
            { id: 'sub_men_sneakers', name: 'Men\'s Sneakers', slug: 'mens-sneakers', parentId: 'cat_sneakers' },
            { id: 'sub_women_sneakers', name: 'Women\'s Sneakers', slug: 'womens-sneakers', parentId: 'cat_sneakers' },
            { id: 'sub_youth_sneakers', name: 'Youth (GS)', slug: 'youth-sneakers', parentId: 'cat_sneakers' },
        ]
    },
    {
        id: 'cat_cards',
        name: 'Collector Cards',
        description: 'Elite NBA and Basketball cards',
        slug: 'collector-cards',
        imageUrl: '/images/categories/cards.jpg',
        section: 'Marketplace',
        order: 2,
        subcategories: [
            { id: 'sub_basketball_cards', name: 'Basketball Cards', slug: 'basketball-cards', parentId: 'cat_cards' },
            { id: 'sub_jordan_cards', name: 'Jordan', slug: 'jordan', parentId: 'cat_cards' },
            { id: 'sub_kobe_cards', name: 'Kobe', slug: 'kobe', parentId: 'cat_cards' },
            { id: 'sub_curry_cards', name: 'Curry', slug: 'curry', parentId: 'cat_cards' },
            { id: 'sub_wembanyama_cards', name: 'Wembanyama', slug: 'wembanyama', parentId: 'cat_cards' },
            { id: 'sub_rookies_cards', name: 'Rookies', slug: 'rookies', parentId: 'cat_cards' },
            { id: 'sub_signed_cards', name: 'Signed', slug: 'signed', parentId: 'cat_cards' },
            { id: 'sub_flag_cards', name: 'Flag', slug: 'flag', parentId: 'cat_cards' },
            { id: 'sub_top100_cards', name: 'Top 100', slug: 'top-100', parentId: 'cat_cards' },
            { id: 'sub_pokemon_cards', name: 'Pokémon', slug: 'pokemon', parentId: 'cat_cards' },
            { id: 'sub_yugioh_cards', name: 'Yu-Gi-Oh!', slug: 'yugioh', parentId: 'cat_cards' },
            { id: 'sub_sports_cards', name: 'Sports Cards', slug: 'sports-cards', parentId: 'cat_cards' },
            { id: 'sub_trading_cards', name: 'Trading Cards', slug: 'trading-cards', parentId: 'cat_cards' },
        ]
    }
];
