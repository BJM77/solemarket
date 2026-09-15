/**
 * Utility to automatically generate internal links to Programmatic SEO pages and Market Pulse data.
 * Used when rendering Markdown content or generating cross-links dynamically.
 */
import { PROGRAMMATIC_ROUTES } from '@/config/programmatic-seo';

export function getInternalLinkForKeyword(keyword: string): string | null {
    const normalizedKeyword = keyword.toLowerCase().trim();
    
    // Check if the keyword matches any programmatic route exactly
    const matchingRoute = PROGRAMMATIC_ROUTES.find(route => {
        const pathParts = route.path.split('/');
        const nameFromPath = pathParts[pathParts.length - 1].replace(/-/g, ' ');
        return normalizedKeyword.includes(nameFromPath) || normalizedKeyword === nameFromPath;
    });

    if (matchingRoute) {
        return `/p/${matchingRoute.path}`;
    }

    return null;
}

export function autoLinkContent(text: string): string {
    let linkedText = text;
    
    // Sort routes by length descending so we match 'jordan 1 high' before 'jordan 1'
    const sortedRoutes = [...PROGRAMMATIC_ROUTES].sort((a, b) => b.path.length - a.path.length);

    sortedRoutes.forEach(route => {
        const pathParts = route.path.split('/');
        const keyword = pathParts[pathParts.length - 1].replace(/-/g, ' ');
        const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
        
        // Simple string replace for now - in a real app you'd parse an AST to avoid matching inside existing HTML/Markdown tags
        linkedText = linkedText.replace(regex, `[$1](/p/${route.path})`);
    });

    return linkedText;
}
