
export interface SEOTopic {
    slug: string;
    title: string;
    h1: string;
    description: string;
    category: 'Sneakers' | 'Trading Cards';
    searchQuery: string;
    keywords: string[];
}

export const SEO_TOPICS: SEOTopic[] = [
    // Sneakers
    {
        slug: 'jordan-1-retro-high',
        title: 'Buy Air Jordan 1 Retro High Australia',
        h1: 'Authentic Air Jordan 1 Retro High',
        description: 'Shop the largest collection of authentic Air Jordan 1 Retro High sneakers in Australia. Verified safe, express shipping available.',
        category: 'Sneakers',
        searchQuery: 'Jordan 1 High',
        keywords: ['jordan 1', 'retro high', 'nike air jordan', 'australia']
    },
    {
        slug: 'kobe-6-protro',
        title: 'Nike Kobe 6 Protro Australia | Buy Authentic',
        h1: 'Nike Kobe 6 Protro Collection',
        description: 'Get your hands on the most iconic performance basketball shoes. Authentic Nike Kobe 6 Protro sneakers, including Reverse Grinch and Mambacita.',
        category: 'Sneakers',
        searchQuery: 'Kobe 6',
        keywords: ['kobe 6', 'protro', 'nike basketball', 'kobe bryant']
    },
    {
        slug: 'yeezy-boost-350',
        title: 'Adidas Yeezy Boost 350 V2 Australia',
        h1: 'Authentic Yeezy Boost 350 V2',
        description: 'The ultimate in comfort and style. Shop verified authentic Adidas Yeezy Boost 350 V2 sneakers in Melbourne, Sydney, and across Australia.',
        category: 'Sneakers',
        searchQuery: 'Yeezy 350',
        keywords: ['yeezy 350', 'adidas yeezy', 'boost 350', 'kanye west']
    },
    {
        slug: 'jordan-4-retro',
        title: 'Air Jordan 4 Retro Australia | Shop Authentics',
        h1: 'Air Jordan 4 Retro Sneakers',
        description: 'Discover rare and classic Air Jordan 4 Retro colorways. Verified authentic by Benched, the premier Australian basketball marketplace.',
        category: 'Sneakers',
        searchQuery: 'Jordan 4',
        keywords: ['jordan 4', 'retro', 'jumpman', 'nike air']
    },
    // Cards
    {
        slug: 'panini-prizm-basketball',
        title: 'Panini Prizm Basketball Cards Australia',
        h1: 'Panini Prizm NBA Cards',
        description: 'The gold standard of NBA collecting. Shop Panini Prizm Basketball hobby boxes, retail, and graded singles in Australia.',
        category: 'Trading Cards',
        searchQuery: 'Panini Prizm Basketball',
        keywords: ['panini prizm', 'nba cards', 'basketball cards', 'hobby box']
    },
    {
        slug: 'victor-wembanyama-rookie',
        title: 'Victor Wembanyama Rookie Cards Australia',
        h1: 'Wemby Rookie Card Collection',
        description: 'Invest in the future. Shop authenticated Victor Wembanyama rookie cards from Panini Prizm, Optic, and more.',
        category: 'Trading Cards',
        searchQuery: 'Victor Wembanyama',
        keywords: ['wembanyama', 'rookie card', 'wemby', 'spurs cards']
    },
    {
        slug: 'donruss-optic-basketball',
        title: 'Donruss Optic Basketball Cards Australia',
        h1: 'Donruss Optic NBA Collection',
        description: 'Shop Donruss Optic Basketball cards. Home of the Rated Rookie. Discover rare holos and signatures from your favorite NBA stars.',
        category: 'Trading Cards',
        searchQuery: 'Donruss Optic Basketball',
        keywords: ['donruss optic', 'rated rookie', 'nba cards', 'basketball']
    },
    {
        slug: 'michael-jordan-cards',
        title: 'Michael Jordan Basketball Cards Australia',
        h1: 'Michael Jordan Collectibles',
        description: 'The GOAT. Shop authentic Michael Jordan basketball cards, from Fleer rookies to rare 90s inserts and modern high-end cards.',
        category: 'Trading Cards',
        searchQuery: 'Michael Jordan',
        keywords: ['michael jordan', 'bulls cards', 'mj cards', 'basketball goat']
    }
];

export function getTopicBySlug(slug: string): SEOTopic | undefined {
    return SEO_TOPICS.find(t => t.slug === slug);
}
