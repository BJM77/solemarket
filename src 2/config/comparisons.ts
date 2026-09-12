export interface Comparison {
    slug: string;
    itemA: {
        name: string;
        brand: string;
        image: string;
        specs: Record<string, string>;
    };
    itemB: {
        name: string;
        brand: string;
        image: string;
        specs: Record<string, string>;
    };
    verdict: string;
    category: 'Sneakers' | 'Collector Cards';
}

export const TOP_COMPARISONS: Comparison[] = [
    {
        slug: 'kobe-6-protro-vs-gt-cut-3',
        category: 'Sneakers',
        itemA: {
            name: 'Kobe 6 Protro',
            brand: 'Nike',
            image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?q=80&w=2600&auto=format&fit=crop',
            specs: {
                'Cushioning': 'Zoom Turbo (Forefoot)',
                'Traction': 'Scaly Mamba Grip',
                'Weight': '340g',
                'Best For': 'Shifty Guards'
            }
        },
        itemB: {
            name: 'G.T. Cut 3',
            brand: 'Nike',
            image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2600&auto=format&fit=crop',
            specs: {
                'Cushioning': 'ZoomX Foam',
                'Traction': 'Herringbone +',
                'Weight': '325g',
                'Best For': 'Explosive Guards'
            }
        },
        verdict: 'The Kobe 6 remains the gold standard for court feel, but the G.T. Cut 3 offers superior impact protection with ZoomX. Choose the Kobe 6 if you prioritize legacy and precision; choose the G.T. Cut 3 if you want modern bounce.'
    },
    {
        slug: 'panini-prizm-vs-optic-basketball',
        category: 'Collector Cards',
        itemA: {
            name: 'Panini Prizm',
            brand: 'Panini',
            image: 'https://images.unsplash.com/photo-1540198163009-7afda7da2945?q=80&w=2600&auto=format&fit=crop',
            specs: {
                'Finish': 'Chrome/Optichrome',
                'Parallels': 'Silver, Mojo, Gold',
                'Market Value': 'Benchmark High',
                'Print Run': 'High'
            }
        },
        itemB: {
            name: 'Panini Donruss Optic',
            brand: 'Panini',
            image: 'https://images.unsplash.com/photo-1623939012339-58635ca86c8f?q=80&w=2600&auto=format&fit=crop',
            specs: {
                'Finish': 'Optichrome (Rated Rookie)',
                'Parallels': 'Holo, Blue, Gold',
                'Market Value': 'Strong Second',
                'Print Run': 'Moderate'
            }
        },
        verdict: 'Prizm is the "Blue Chip" of basketball cards, holding the highest value for Silvers. Optic is beloved for its "Rated Rookie" logo and cleaner design. For long-term holding, Prizm wins; for aesthetics and shorters runs, Optic is the play.'
    }
];

export function getComparisonBySlug(slug: string) {
    return TOP_COMPARISONS.find(c => c.slug === slug);
}
