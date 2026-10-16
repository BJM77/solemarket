/**
 * Resolve the public name to show for a seller. Product docs often carry stale or
 * placeholder seller names ("Unknown Seller", "Admin", "User", "Benched Member"), so
 * prefer the seller's profile (store name, business name, display name) and skip placeholders.
 */
const PLACEHOLDERS = new Set([
    '', 'unknown', 'unknown seller', 'unknown user', 'admin', 'administrator', 'superadmin',
    'user', 'benched member', 'member', 'anonymous', 'seller', 'private seller', 'null', 'undefined',
]);

export function isPlaceholderSellerName(name?: string | null): boolean {
    if (!name || typeof name !== 'string') return true;
    const n = name.trim().toLowerCase();
    if (PLACEHOLDERS.has(n)) return true;
    // Never show an email address as a public name.
    return n.includes('@');
}

export type SellerNameSource = {
    storeName?: string | null;
    businessName?: string | null;
    displayName?: string | null;
} | null | undefined;

export function resolveSellerName(profile: SellerNameSource, ...fallbacks: (string | null | undefined)[]): string {
    const candidates = [profile?.storeName, profile?.businessName, profile?.displayName, ...fallbacks];
    for (const c of candidates) {
        if (!isPlaceholderSellerName(c)) return String(c).trim();
    }
    return 'Private Seller';
}
