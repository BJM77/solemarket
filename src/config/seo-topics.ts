
export interface SEOTopic {
    slug: string;
    title: string;
    h1: string;
    description: string;
    category: 'Sneakers' | 'Collector Cards' | 'Coins';
    searchQuery: string;
    keywords: string[];
}

export const SEO_TOPICS: SEOTopic[] = [
    // Sneakers
    {
        slug: 'jordan-1-retro-high',
        title: 'Buy Air Jordan 1 Retro High in Australia',
        h1: 'Air Jordan 1 Retro High',
        description: 'Air Jordan 1 Retro High sneakers listed by Australian sellers on Benched. Pay the seller directly by PayID or cash on pickup in Perth.',
        category: 'Sneakers',
        searchQuery: 'Jordan 1',
        keywords: ['jordan 1', 'retro high', 'nike air jordan', 'australia']
    },
    {
        slug: 'kobe-6-protro',
        title: 'Buy Nike Kobe 6 Protro in Australia',
        h1: 'Nike Kobe 6 Protro',
        description: 'Nike Kobe 6 Protro basketball shoes listed by Australian sellers on Benched. Message the seller, then pay directly by PayID or cash on pickup.',
        category: 'Sneakers',
        searchQuery: 'Kobe 6',
        keywords: ['kobe 6', 'protro', 'nike basketball', 'kobe bryant']
    },
    {
        slug: 'yeezy-boost-350',
        title: 'Buy adidas Yeezy Boost 350 V2 in Australia',
        h1: 'adidas Yeezy Boost 350 V2',
        description: 'adidas Yeezy Boost 350 V2 sneakers listed by Australian sellers on Benched. Pay the seller directly by PayID or cash on pickup.',
        category: 'Sneakers',
        searchQuery: 'Yeezy 350',
        keywords: ['yeezy 350', 'adidas yeezy', 'boost 350', 'kanye west']
    },
    {
        slug: 'jordan-4-retro',
        title: 'Buy Air Jordan 4 Retro in Australia',
        h1: 'Air Jordan 4 Retro',
        description: 'Air Jordan 4 Retro sneakers listed by Australian sellers on Benched. Check the photos, ask the seller questions and pay directly by PayID or cash.',
        category: 'Sneakers',
        searchQuery: 'Jordan 4',
        keywords: ['jordan 4', 'retro', 'jumpman', 'nike air']
    },
    // Cards
    {
        slug: 'panini-prizm-basketball',
        title: 'Panini Prizm Basketball Cards Australia',
        h1: 'Panini Prizm Basketball Cards',
        description: 'Panini Prizm NBA cards, raw and graded, listed by Australian collectors on Benched. Pay the seller directly by PayID or cash on pickup.',
        category: 'Collector Cards',
        searchQuery: 'Panini Prizm',
        keywords: ['panini prizm', 'nba cards', 'basketball cards', 'hobby box']
    },
    {
        slug: 'victor-wembanyama-rookie',
        title: 'Victor Wembanyama Cards Australia',
        h1: 'Victor Wembanyama Cards',
        description: 'Victor Wembanyama rookie and base cards from Panini Prizm, Optic, Phoenix and more, listed by Australian collectors on Benched.',
        category: 'Collector Cards',
        searchQuery: 'Wembanyama',
        keywords: ['wembanyama', 'rookie card', 'wemby', 'spurs cards']
    },
    {
        slug: 'donruss-optic-basketball',
        title: 'Donruss Optic Basketball Cards Australia',
        h1: 'Donruss Optic Basketball Cards',
        description: 'Donruss Optic NBA cards, including Rated Rookies and parallels, listed by Australian collectors on Benched.',
        category: 'Collector Cards',
        searchQuery: 'Optic',
        keywords: ['donruss optic', 'rated rookie', 'nba cards', 'basketball']
    },
    {
        slug: 'michael-jordan-cards',
        title: 'Michael Jordan Basketball Cards Australia',
        h1: 'Michael Jordan Cards',
        description: 'Michael Jordan basketball cards, from Fleer and Upper Deck to modern inserts, listed by Australian collectors on Benched.',
        category: 'Collector Cards',
        searchQuery: 'Michael Jordan',
        keywords: ['michael jordan', 'bulls cards', 'mj cards', 'basketball goat']
    },
    // --- Long-tail topics ---
    {
        slug: 'nike-dunk-low-pandas',
        title: 'Buy Nike Dunk Low Panda in Australia',
        h1: 'Nike Dunk Low Black & White (Panda)',
        description: 'Nike Dunk Low Panda sneakers listed by Australian sellers on Benched. Pay the seller directly by PayID or cash on pickup in Perth.',
        category: 'Sneakers',
        searchQuery: 'Dunk Low',
        keywords: ['dunk low panda', 'nike dunk', 'black and white dunks', 'buy dunks australia']
    },
    {
        slug: 'jordan-4-military-blue',
        title: 'Buy Air Jordan 4 Military Blue in Australia',
        h1: 'Air Jordan 4 Military Blue',
        description: 'Air Jordan 4 Military Blue sneakers listed by Australian sellers on Benched. Pay the seller directly by PayID or cash on pickup.',
        category: 'Sneakers',
        searchQuery: 'Jordan 4 Military Blue',
        keywords: ['jordan 4 military blue', 'jordan 4', 'retro 4', 'nike air']
    },
    {
        slug: 'upper-deck-lebron-james-rookie',
        title: 'LeBron James Cards Australia',
        h1: 'LeBron James Cards',
        description: 'LeBron James basketball cards, from rookies to modern Prizm and Optic, listed by Australian collectors on Benched.',
        category: 'Collector Cards',
        searchQuery: 'LeBron James',
        keywords: ['lebron james rookie', 'topps chrome lebron', 'upper deck lebron', 'nba cards']
    },
    // Coins
    {
        slug: '1930-australian-penny',
        title: 'Buy 1930 Australian Penny | Rare Coins Australia',
        h1: '1930 Australian Penny (King George V)',
        description: 'The most sought-after Australian coin. Find 1930 Australian Penny listings from Australian collectors, including PCGS/NGC graded examples where the seller has them.',
        category: 'Coins',
        searchQuery: '1930 Penny',
        keywords: ['1930 penny', 'rare australian coins', 'king george v', 'numismatics']
    },
    {
        slug: 'gold-sovereigns-australia',
        title: 'Gold Sovereigns Australia | Buy Graded Gold Coins',
        h1: 'Australian Gold Sovereigns',
        description: 'Australian gold sovereigns from the Perth, Sydney and Melbourne mints, listed by Australian collectors. Check the photos and details in each listing before you buy.',
        category: 'Coins',
        searchQuery: 'Gold Sovereign',
        keywords: ['gold sovereign', 'bullion', 'perth mint', 'gold coins']
    },
    {
        slug: 'pcgs-graded-coins-australia',
        title: 'PCGS Graded Coins Australia | Shop Slabs',
        h1: 'PCGS Graded Numismatics',
        description: 'PCGS graded Australian and world coins listed by Australian collectors. Check the slab photos and cert number in each listing.',
        category: 'Coins',
        searchQuery: 'PCGS',
        keywords: ['pcgs', 'graded coins', 'slabs', 'numismatics']
    },
];

export function getTopicBySlug(slug: string): SEOTopic | undefined {
    return SEO_TOPICS.find(t => t.slug === slug);
}
