/**
 * Pure auto-repricing decision (unit tested). One run may drop a listing's price once; it then
 * waits a full waiting period (from the last view AND from the last reprice) before dropping
 * again, and never goes below FLOOR_RATIO of the price it had before the first auto drop.
 */

export const FLOOR_RATIO = 0.5;

export interface RepricingSettingsLike {
    viewThreshold: number;
    priceDropPercentage: number;
    waitingPeriodHours: number;
}

export interface RepriceDecision {
    newPrice: number;
    /** Price before the first auto drop (kept on the listing as `originalPrice`). */
    originalPrice: number;
    floor: number;
}

/** Timestamp | Date | ISO string | number | {seconds} -> ms (or null). */
export function toMillis(v: any): number | null {
    if (v == null) return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (typeof v === 'string') {
        const t = new Date(v).getTime();
        return Number.isNaN(t) ? null : t;
    }
    if (v instanceof Date) return v.getTime();
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (typeof v.toDate === 'function') return v.toDate().getTime();
    if (typeof v.seconds === 'number') return v.seconds * 1000;
    if (typeof v._seconds === 'number') return v._seconds * 1000;
    return null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function decideReprice(product: any, settings: RepricingSettingsLike, now: number): RepriceDecision | null {
    if (!product || product.autoRepricingEnabled !== true) return null;
    if (product.status !== 'available' || product.isDraft || product.isPrivate) return null;
    if (!(Number(product.uniqueViews) >= settings.viewThreshold)) return null;

    const pct = Number(settings.priceDropPercentage);
    if (!(pct > 0 && pct < 100)) return null;
    const waitMs = Math.max(0, Number(settings.waitingPeriodHours) || 0) * 3_600_000;

    const lastViewed = toMillis(product.lastViewedTimestamp);
    if (lastViewed == null || now - lastViewed < waitMs) return null;

    // Don't drop again until a full waiting period has passed since the last auto drop.
    const lastRepriced = toMillis(product.lastRepricedAt);
    if (lastRepriced != null && now - lastRepriced < Math.max(waitMs, 3_600_000)) return null;

    const current = Number(product.price) || 0;
    if (current <= 0) return null;
    const stored = Number(product.originalPrice);
    const originalPrice = stored > 0 ? stored : current;
    const floor = round2(Math.max(1, originalPrice * FLOOR_RATIO));
    if (current <= floor) return null;

    const dropped = round2(current * (1 - pct / 100));
    const newPrice = Math.max(floor, dropped);
    if (!(newPrice < current)) return null;
    return { newPrice, originalPrice, floor };
}
