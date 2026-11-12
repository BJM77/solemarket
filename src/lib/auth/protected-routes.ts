/**
 * Which /sell and /seller paths need a signed-in user (checked in middleware).
 * Public: the /sell landing page, the /sellers directory and each seller's storefront
 * (/seller/{id}), so signed-out buyers can browse and buy from a seller's other listings.
 */
const PRIVATE_SELLER_SECTIONS = new Set(['agreement', 'analytics', 'bundles', 'dashboard', 'onboarding', 'price-check']);

export function isSellerAreaProtected(pathname: string): boolean {
    const p = (pathname || '/').replace(/\/+$/, '') || '/';
    if (p === '/sell') return false;
    if (p.startsWith('/sell/')) return true;
    if (p === '/seller') return true;
    if (p.startsWith('/seller/')) {
        const first = p.split('/')[2] || '';
        return PRIVATE_SELLER_SECTIONS.has(first);
    }
    return false; // includes /sellers (public directory)
}
