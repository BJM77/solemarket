export interface ProgrammaticRoute {
    path: string;
    category: 'shoes' | 'cards' | 'coins';
    searchVolume: number; // Monthly AU searches
    competition: number; // KD score
    priority: 'high' | 'medium' | 'low';
    hasInventory: boolean; // Do you have listings for this?
}

export const PROGRAMMATIC_ROUTES: ProgrammaticRoute[] = [
    // --- SNEAKERS ---
    // HIGH priority (build immediately)
    { path: 'jordan/1', category: 'shoes', searchVolume: 8100, competition: 32, priority: 'high', hasInventory: true },
    { path: 'jordan/4', category: 'shoes', searchVolume: 5400, competition: 35, priority: 'high', hasInventory: true },
    { path: 'nike/dunk-low', category: 'shoes', searchVolume: 12100, competition: 28, priority: 'high', hasInventory: true },
    { path: 'nike/kobe-6', category: 'shoes', searchVolume: 2900, competition: 22, priority: 'high', hasInventory: false },
    // MEDIUM priority (build after proving the pattern)
    { path: 'jordan/11', category: 'shoes', searchVolume: 2400, competition: 30, priority: 'medium', hasInventory: true },
    { path: 'nike/kobe-5', category: 'shoes', searchVolume: 1300, competition: 25, priority: 'medium', hasInventory: false },
    // LOW priority (defer)
    { path: 'jordan/2', category: 'shoes', searchVolume: 720, competition: 40, priority: 'low', hasInventory: false },

    // --- CARDS ---
    // HIGH priority
    { path: 'panini-prizm/wembanyama', category: 'cards', searchVolume: 4200, competition: 30, priority: 'high', hasInventory: true },
    { path: 'fleer/michael-jordan', category: 'cards', searchVolume: 6100, competition: 38, priority: 'high', hasInventory: true },
    // MEDIUM priority
    { path: 'donruss-optic/anthony-edwards', category: 'cards', searchVolume: 2100, competition: 25, priority: 'medium', hasInventory: true },

    // --- COINS ---
    // HIGH priority
    { path: 'australia/penny/1930', category: 'coins', searchVolume: 5400, competition: 25, priority: 'high', hasInventory: true }
];

/**
 * Helper to get routes by category and priority.
 */
export function getRoutesByCategoryAndPriority(category: ProgrammaticRoute['category'], priorities: ProgrammaticRoute['priority'][] = ['high', 'medium', 'low']) {
    return PROGRAMMATIC_ROUTES.filter(route => route.category === category && priorities.includes(route.priority));
}
