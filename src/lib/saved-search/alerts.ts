/** Saved-search alert planning (pure, unit tested). */
import { matchesSavedSearch, type MatchableProduct, type SavedSearchCriteria } from './match';

export interface AlertProduct extends MatchableProduct { id: string; sellerId?: string; isDraft?: boolean; price?: number }
export interface AlertSearch { id: string; userId: string; name?: string; criteria: SavedSearchCriteria; alertsEnabled?: boolean }
export interface PlannedAlert { searchId: string; userId: string; searchName: string; criteria: SavedSearchCriteria; productIds: string[] }

export const MAX_PRODUCTS_PER_ALERT = 5;
export const MAX_ALERTS_PER_USER_PER_RUN = 5;

export const alertKey = (searchId: string, productId: string) => `${searchId}_${productId}`.replace(/[^\w-]/g, '').slice(0, 300);

/** A listing is alertable once: live, not a draft. */
export const isAlertable = (p: AlertProduct) => p.status === 'available' && p.isDraft !== true;

/**
 * Match new listings against saved searches.
 * - skips paused searches and users who opted out of all saved-search alerts
 * - never alerts a seller about their own listing
 * - skips (search, listing) pairs already alerted (`alreadySent` holds alertKey values)
 * - one digest per search, at most MAX_ALERTS_PER_USER_PER_RUN searches per user per run
 */
export function planAlerts(
  products: AlertProduct[],
  searches: AlertSearch[],
  opts: { alreadySent?: Set<string>; optedOutUsers?: Set<string> } = {},
): PlannedAlert[] {
  const live = products.filter(isAlertable);
  const perUser: Record<string, number> = {};
  const out: PlannedAlert[] = [];
  for (const s of searches) {
    if (!s.userId || s.alertsEnabled === false || opts.optedOutUsers?.has(s.userId)) continue;
    const ids = live
      .filter((p) => p.sellerId !== s.userId && !opts.alreadySent?.has(alertKey(s.id, p.id)) && matchesSavedSearch(p, s.criteria || {}))
      .map((p) => p.id);
    if (!ids.length) continue;
    if ((perUser[s.userId] || 0) >= MAX_ALERTS_PER_USER_PER_RUN) continue;
    perUser[s.userId] = (perUser[s.userId] || 0) + 1;
    out.push({ searchId: s.id, userId: s.userId, searchName: s.name || 'your saved search', criteria: s.criteria || {}, productIds: ids });
  }
  return out;
}
