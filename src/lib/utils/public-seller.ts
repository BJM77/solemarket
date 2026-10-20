/**
 * Whitelist of seller-profile fields that are safe to send to any visitor.
 * Never add email, phone, address, PayID or payout fields here.
 */
export const PUBLIC_SELLER_FIELDS = [
    'displayName', 'storeName', 'businessName', 'storeDescription', 'bio',
    'photoURL', 'avatarUrl', 'bannerUrl', 'shopSlug', 'isVerified', 'isFounder',
    'rating', 'totalSales', 'joinDate', 'createdAt', 'role', 'accountType', 'canSell', 'payIdReady',
] as const;

export function pickPublicSellerFields(data: Record<string, any> | null | undefined): Record<string, any> {
    const out: Record<string, any> = {};
    if (!data) return out;
    for (const k of PUBLIC_SELLER_FIELDS) if (data[k] !== undefined) out[k] = data[k];
    return out;
}
