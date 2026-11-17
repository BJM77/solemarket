/** How many Just Listed tiles fill 3 rows of 5 on the desktop homepage. */
export const JUST_LISTED_COUNT = 15;

/**
 * Pick the Just Listed rail: newest first, prefer items that are not already
 * in Popular Listings, but fill to `count` from the newest overall when needed
 * so a 5-column desktop grid can show complete rows.
 *
 * `newest` must already be in createdAt descending order, with coins/TCG excluded.
 */
export function pickJustListed<T extends { id: string }>(
  newest: T[],
  featuredIds: Iterable<string>,
  count = JUST_LISTED_COUNT,
): T[] {
  const featured = featuredIds instanceof Set ? featuredIds : new Set(featuredIds);
  const fresh = newest.filter((p) => !featured.has(p.id));
  return (fresh.length >= count ? fresh : newest).slice(0, count);
}
